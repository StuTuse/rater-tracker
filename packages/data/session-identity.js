// SDK setSession restores tokens without always returning the cached user profile.
// A verified identity may survive only when the session subject is the same user.
export function sessionIdentity(data, saved, label='') {
 const user=data?.user??data?.session?.user,subject=data?.session?.sub;
 if(user?.is_anonymous)return null;
 const id=[user?.id,user?.ID,user?.uid].find(v=>typeof v==='string'&&v.length);
 if(id){if(subject&&subject!==id)throw Error('登录凭证与账号身份不一致，请重新登录');return{id,name:label||[user.username,user.name].find(v=>typeof v==='string'&&v.length)||'我的账号'};}
 return saved?.id&&subject===saved.id?{id:saved.id,name:label||saved.name}:null;
}
