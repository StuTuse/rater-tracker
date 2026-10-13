const { randomUUID } = require('node:crypto');
function checked(result) { if (result?.error) throw new Error(/SignUpRequest\.Username/.test(result.error.message ?? '') ? '账号不符合云端规则，请返回注册页修改为 6～25 位小写字母、数字、_ 或 -，以小写字母开头，然后重新发送验证码' : result.error.message || '注册未完成'); return result?.data ?? result; }
module.exports = function createRegistration(auth, verified) {
  let pending;
  return {
    begin: async values => {
      const { email, username, password } = values ?? {};
      if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('请输入有效邮箱');
      if (typeof username !== 'string' || !/^[a-z][0-9a-z_-]{5,24}$/.test(username)) throw new Error('账号需为 6～25 位小写字母、数字、_ 或 -，以小写字母开头');
      if (typeof password !== 'string' || password.length < 8 || password.length > 32) throw new Error('密码需为 8～32 位');
      pending = null;
      const data = checked(await auth.signUp({ email, username, password }));
      if (typeof data?.verifyOtp !== 'function') throw new Error('未获得邮箱验证流程，请检查云端注册配置');
      const id = randomUUID();
      pending = { id, username, verify: data.verifyOtp, expires: Date.now() + 10 * 60 * 1000 };
      return { id, email };
    },
    confirm: async (id, token) => {
      if (!pending || pending.id !== id || pending.expires < Date.now()) throw new Error('验证已过期，请重新发送验证码');
      if (typeof token !== 'string' || !/^[0-9]{4,8}$/.test(token)) throw new Error('请输入邮箱中的数字验证码');
      checked(await pending.verify({ token }));
      const username = pending.username;
      pending = null;
      return verified(username);
    },
    clear: () => { pending = null; }
  };
};
