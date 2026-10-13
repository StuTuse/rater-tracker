import cloudbase from './vendor/cloudbase.js';
export const CLOUD_ENV = 'rater-tracker-sync-d3cx88f64aea2';
const app = cloudbase.init({ env: CLOUD_ENV, region: 'ap-shanghai', persistence: 'local', auth: { detectSessionInUrl: false } });
const auth = app.auth();
function checked(result) { if (result?.error) throw new Error(result.error.message || '账号操作失败'); return result?.data ?? result; }
export async function currentAccount() {
  if (window.desktop) return window.desktop.accountCurrent();
  const result = checked(await auth.getSession());
  const user = result?.user ?? result?.session?.user;
  if (!user || user.is_anonymous) return null;
  const id = [user.id, user.ID, user.uid].find(value => typeof value === 'string' && value.length);
  const name = [user.username, user.name].find(value => typeof value === 'string' && value.length) ?? '我的账号';
  return id ? { id, name } : null;
}
export async function loginAccount(username, password) {
  if (window.desktop) return window.desktop.accountLogin(username, password);
  checked(await auth.signInWithPassword({ username, password }));
  const account = await currentAccount();
  if (!account) throw new Error('未获得有效账号身份');
  return account;
}
export async function logoutAccount() { if (window.desktop) return window.desktop.accountLogout(); checked(await auth.signOut()); }
export async function cloudSync(data) {
  if (window.desktop) return window.desktop.accountSync(data);
  const result = await app.rdb().rpc('rater_sync', {
    p_type: data.type, p_base_version: data.baseVersion ?? 0,
    p_request_id: data.requestId ?? null, p_state: data.state ?? null
  });
  if (result.error) throw new Error(result.error.message ?? '云端同步未成功');
  return result.data;
}
