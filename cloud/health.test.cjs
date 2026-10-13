const test = require('node:test');
const assert = require('node:assert/strict');
const { main } = require('./functions/rater-health/index.js');

test('health probe returns only fixed metadata and server time', async () => {
  const result = await main({ secret: 'never-echo-this' });
  assert.deepEqual(Object.keys(result).sort(), ['ok', 'protocol', 'serverTime', 'service']);
  assert.equal(result.ok, true);
  assert.equal(result.service, 'rater-tracker-health');
  assert.equal(result.protocol, 1);
  assert.ok(Number.isFinite(Date.parse(result.serverTime)));
  assert.ok(!JSON.stringify(result).includes('never-echo-this'));
});
