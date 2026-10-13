import cloudbase from './vendor/cloudbase.js';
import { usernameForAuth } from './username.js';
export const CLOUD_ENV = 'rater-tracker-sync-d3cx88f64aea2';
const app = cloudbase.init({ env: CLOUD_ENV, region: 'ap-shanghai', persistence: 'local', auth: { detectSessionInUrl: false } });
const auth = app.auth();
let usernameLabel = '';
function checked(result) { if (result?.error) throw new Error(result.error.message || '账号操作失败'); return result?.data ?? result; }
export async function currentAccount() {
  if (window.desktop) return window.desktop.accountCurrent();
  const result = checked(await auth.getSession());
  const user = result?.user ?? result?.session?.user;
  if (!user || user.is_anonymous) return null;
  const id = [user.id, user.ID, user.uid].find(value => typeof value === 'string' && value.length);
  const name = usernameLabel || [user.username, user.name].find(value => typeof value === 'string' && value.length) || '我的账号';
  return id ? { id, name } : null;
}
export async function loginAccount(username, password) {
  const authUsername = usernameForAuth(username);
  if (window.desktop) return window.desktop.accountLogin(username, password);
  checked(await auth.signInWithPassword({ username: authUsername, password }));
  usernameLabel = username;
  const account = await currentAccount();
  if (!account) throw new Error('未获得有效账号身份');
  return account;
}
export async function logoutAccount() { if (window.desktop) return window.desktop.accountLogout(); checked(await auth.signOut()); usernameLabel = ''; }
let registration;
export async function registerAccount(values) {
  const authUsername = usernameForAuth(values?.username, true);
  if (window.desktop) return window.desktop.accountRegister(values);
  registration = null;
  const data = checked(await auth.signUp({ ...values, username: authUsername }));
  if (typeof data?.verifyOtp !== 'function') throw new Error('未获得邮箱验证流程');
  const id = crypto.randomUUID(); registration = { id, verify: data.verifyOtp, username: values.username };
  return { id, email: values.email };
}
export async function verifyRegistration(id, token) {
  if (window.desktop) return window.desktop.accountVerifyRegistration(id, token);
  if (registration?.id !== id) throw new Error('请重新发送验证码');
  checked(await registration.verify({ token })); usernameLabel = registration.username; registration = null;
  return currentAccount();
}
export async function cloudSync(data) {
  if (window.desktop) return window.desktop.accountSync(data);
  const result = await app.rdb().rpc('rater_sync', {
    p_type: data.type, p_base_version: data.baseVersion ?? 0,
    p_request_id: data.requestId ?? null, p_state: data.state ?? null
  });
  if (result.error) throw new Error(result.error.message ?? '云端同步未成功');
  return result.data;
}
