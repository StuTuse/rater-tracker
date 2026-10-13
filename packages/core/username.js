// CloudBase's auth identifier is lowercase; the entered label keeps its casing.
export function usernameForAuth(value, registration = false) {
  if (typeof value !== 'string' || !value || value.length > 25) throw new Error('账号输入无效');
  if (registration && !/^[A-Za-z][0-9A-Za-z_-]{5,24}$/.test(value)) {
    throw new Error('账号需为 6～25 位字母、数字、_ 或 -，以字母开头');
  }
  return value.toLowerCase();
}
