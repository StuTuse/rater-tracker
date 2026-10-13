import{usernameForAuth}from'../core/username.js';
export function createRegistration(auth,verified,{now=()=>Date.now(),id=()=>crypto.randomUUID()}={}){
 let pending,generation=0;
 const checked=result=>{if(result?.error)throw Error(/SignUpRequest\.Username/.test(result.error.message??'')?'账号需为6～25位字母、数字、_或-，以字母开头':result.error.message||'注册未完成');return result?.data??result;};
 return{
  begin:async values=>{
   const{username,email,password}=values??{},canonical=usernameForAuth(username,true);
   if(typeof email!=='string'||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('请输入有效邮箱');
   if(typeof password!=='string'||password.length<8||password.length>32)throw Error('密码需为8～32位');
   const attempt=++generation;pending=null;const data=checked(await auth.signUp({username:canonical,email,password}));
   if(attempt!==generation)throw Error('注册已取消，请重新开始');
   if(typeof data?.verifyOtp!=='function')throw Error('未获得邮箱验证流程');
   pending={id:id(),username,verify:data.verifyOtp,expires:now()+600000,generation:attempt};return{id:pending.id,email};
  },
  confirm:async(challenge,token)=>{
   const attempt=pending;
   if(!attempt||attempt.id!==challenge||attempt.expires<now())throw Error('验证已过期，请重新发送验证码');
   if(typeof token!=='string'||!/^[0-9]{4,8}$/.test(token))throw Error('请输入邮箱中的数字验证码');
   checked(await attempt.verify({token}));
   if(attempt!==pending||attempt.generation!==generation){try{await auth.signOut?.();}catch{}throw Error('验证已取消，请重新开始');}
   pending=null;return verified(attempt.username);
  },
  clear:()=>{++generation;pending=null;}
 };
}
