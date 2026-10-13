import test from 'node:test';
import assert from 'node:assert/strict';
import createRegistration from '../electron/registration.cjs';
import { usernameForAuth } from '../src/username.js';
const values = { username: 'rater_test', email: 'test@example.com', password: 'Secret_test123' };
test('invalid registration never sends a verification request', async () => {
  let sent = 0;
  const registration = createRegistration({ signUp: async () => { sent++; } }, () => {});
  for (const invalid of [{ ...values, email: 'bad' }, ...['中文账号','_rater','rater','1rater','rater.test','rater+test','rater@test','a'.repeat(26)].map(username => ({...values,username})), { ...values, password: 'short' }]) await assert.rejects(registration.begin(invalid));
  assert.equal(sent, 0);
});
test('signup accepts exact backend username boundaries before sending any code', async () => {
  const sent = [];
  const registration = createRegistration({ signUp: async params => { sent.push(params.username); return { data: { verifyOtp: async () => ({ data: {} }) } }; } }, () => ({ id: '1' }));
  for (const username of ['abc123', 'a'.repeat(25), 'rater_test-01', 'Rater_TEST', 'Z'.repeat(25)]) await registration.begin({ ...values, username });
  assert.deepEqual(sent, ['abc123', 'a'.repeat(25), 'rater_test-01', 'rater_test', 'z'.repeat(25)]);
});
test('uppercase labels survive verification while login uses the same canonical identifier', async () => {
  const username = 'Rater_TEST';let sent;
  const registration = createRegistration({ signUp: async params => { sent=params;return {data:{verifyOtp:async()=>({data:{}})}}; } }, name=>({id:'case-user',name}));
  const challenge = await registration.begin({...values,username});
  assert.equal(sent.username,'rater_test');
  assert.equal(usernameForAuth(username),usernameForAuth('rater_test'));
  assert.deepEqual(await registration.confirm(challenge.id,'123456'),{id:'case-user',name:username});
  assert.equal(usernameForAuth('legacy'), 'legacy');
  assert.throws(()=>usernameForAuth('A'.repeat(26),true));
});
test('wrong code can retry; identity appears only after verified signup and cannot replay', async () => {
  let identityCount = 0;
  const registration = createRegistration({ signUp: async () => ({ data: { verifyOtp: async ({ token }) => token === '123456' ? { data: {} } : { error: { message: '验证码不正确' } } } }) }, username => { identityCount++; return { id: 'user-1', name: username }; });
  const challenge = await registration.begin(values);
  assert.deepEqual(Object.keys(challenge).sort(), ['email', 'id']);
  assert.equal(identityCount, 0);
  await assert.rejects(registration.confirm('another-flow', '123456'));
  await assert.rejects(registration.confirm(challenge.id, '000000'));
  assert.equal(identityCount, 0);
  assert.deepEqual(await registration.confirm(challenge.id, '123456'), { id: 'user-1', name: values.username });
  await assert.rejects(registration.confirm(challenge.id, '123456'));
  assert.equal(identityCount, 1);
});
test('superseded and cancelled verification flows cannot log in', async () => {
  const registration = createRegistration({ signUp: async () => ({ data: { verifyOtp: async () => ({ data: {} }) } }) }, () => ({ id: '1' }));
  const first = await registration.begin(values), second = await registration.begin(values);
  await assert.rejects(registration.confirm(first.id, '123456'));
  registration.clear(); await assert.rejects(registration.confirm(second.id, '123456'));
});
