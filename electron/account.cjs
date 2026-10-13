const cloudbase = require('./cloudbase.cjs').default;
const fs = require('node:fs/promises');
const path = require('node:path');
function checked(r) { if (r?.error) throw new Error(r.error.message || '账号操作失败'); return r?.data ?? r; }
module.exports = function createAccountService(directory, safeStorage) {
  const app = cloudbase.init({ env: 'rater-tracker-sync-d3cx88f64aea2', region: 'ap-shanghai', persistence: 'session' });
  const auth = app.auth();
  const sessionPath = path.join(directory, 'account-session.bin');
  let restored = false;
  let usernameLabel = '';
  async function restore() {
    if (restored) return;
    restored = true;
    try {
      if (!safeStorage.isEncryptionAvailable()) return;
      const session = JSON.parse(safeStorage.decryptString(await fs.readFile(sessionPath)));
      usernameLabel = typeof session._raterLabel === 'string' ? session._raterLabel : '';
      checked(await auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token }));
    } catch { /* Expired or absent session never prevents opening local records. */ }
  }
  async function persist() {
    const data = checked(await auth.getSession());
    if (data?.session && safeStorage.isEncryptionAvailable()) {
      await fs.mkdir(directory, { recursive: true });
      const temp = `${sessionPath}.tmp`;
      await fs.writeFile(temp, safeStorage.encryptString(JSON.stringify({ ...data.session, _raterLabel: usernameLabel })));
      await fs.rename(temp, sessionPath);
    }
    return data;
  }
  function identity(data) {
    const user = data?.user ?? data?.session?.user;
    if (!user || user.is_anonymous) return null;
    const id = [user.id, user.ID, user.uid].find(value => typeof value === 'string' && value.length);
    const name = usernameLabel || [user.username, user.name].find(value => typeof value === 'string' && value.length) || '我的账号';
    return id ? { id, name } : null;
  }
  return {
    current: async () => {
      await restore();
      try { return identity(await persist()); }
      catch (error) { if (/credentials not found|no session/i.test(error.message)) return null; throw error; }
    },
    login: async (username, password) => {
      if (typeof username !== 'string' || typeof password !== 'string' || username.length > 24 || password.length > 128) throw new Error('账号输入无效');
      await restore(); checked(await auth.signInWithPassword({ username, password })); usernameLabel = username;
      const account = identity(await persist());
      if (!account) throw new Error('未获得账号身份');
      return account;
    },
    logout: async () => { checked(await auth.signOut()); await fs.rm(sessionPath, { force: true }); },
    sync: async data => {
      await restore();
      if (!identity(checked(await auth.getSession()))) throw new Error('请重新登录后同步');
      if (!['pull', 'push'].includes(data?.type)) throw new Error('同步请求无效');
      const result = await app.rdb().rpc('rater_sync', { p_type: data.type, p_base_version: data.baseVersion ?? 0, p_request_id: data.requestId ?? null, p_state: data.state ?? null });
      if (result.error) throw new Error(result.error.message ?? '云端同步失败');
      await persist(); return result.data;
    }
  };
};
