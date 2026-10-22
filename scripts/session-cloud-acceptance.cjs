// Creates only a new synthetic identity. Never accepts a personal account.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=process.cwd(),base=path.join(root,'runtime-data/session103-cloud'),cli=path.join(root,'cloud/node_modules/@cloudbase/cli/bin/tcb'),envId='rater-tracker-sync-d3cx88f64aea2';
fs.mkdirSync(base,{recursive:true});
function command(args){const raw=execFileSync(process.execPath,[cli,...args,'-e',envId,'--region','ap-shanghai','--json','--yes'],{cwd:path.join(root,'cloud'),encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']});return JSON.parse(raw);}
function fixture(){const f=JSON.parse(fs.readFileSync(path.join(base,'fixture.json')));if(f.purpose!=='Synthetic login persistence acceptance 1.0.3'||!/^rt\d+$/.test(f.username)||!f.id)throw Error('Known synthetic fixture required');return f;}
function safe(dir){const file=path.join(dir,'local-test-key');fs.mkdirSync(dir,{recursive:true});if(!fs.existsSync(file))fs.writeFileSync(file,crypto.randomBytes(32));const key=fs.readFileSync(file);return{isEncryptionAvailable:()=>true,encryptString:s=>{const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key,iv),body=Buffer.concat([c.update(s),c.final()]);return Buffer.concat([iv,c.getAuthTag(),body]);},decryptString:b=>{const c=crypto.createDecipheriv('aes-256-gcm',key,b.subarray(0,12));c.setAuthTag(b.subarray(12,28));return Buffer.concat([c.update(b.subarray(28)),c.final()]).toString('utf8');}};}
(async()=>{
 const phase=process.argv[2];
 if(phase==='cleanup'){const f=fixture();command(['user','delete',f.id]);fs.writeFileSync(path.join(base,'deleted.json'),JSON.stringify({deleted:true}));console.log('Synthetic account deleted; no business data written.');return;}
 if(phase==='child'){
  const f=fixture(),dir=path.join(base,process.argv[3]),encryption=safe(dir),service=require(path.join(root,'apps/windows/electron/account.cjs'))(dir,encryption);
  if(process.argv[4]==='expire'){const file=path.join(dir,'account-session.bin'),row=JSON.parse(encryption.decryptString(fs.readFileSync(file)));row.lastActive=Date.now()-29*86400000;row.session.expires_at=new Date(Date.now()-86400000).toISOString();fs.writeFileSync(file,encryption.encryptString(JSON.stringify(row)));}
  const user=process.argv[4]==='login'?await service.login(f.username,f.password):await service.current();
  if(user?.id!==f.id||user.needsLogin)throw Error('Synthetic identity did not restore');
  const cloud=await service.sync({type:'pull',accountId:f.id});if(cloud.version!==0||cloud.state)throw Error('Synthetic cloud must remain empty');
  const row=JSON.parse(encryption.decryptString(fs.readFileSync(path.join(dir,'account-session.bin'))));if(!row.session.refresh_token||!row.storage)throw Error('Missing durable credentials');
  console.log(JSON.stringify({identityMatches:true,readOnlyCloudPull:true,encryptedCredentials:true}));setTimeout(()=>process.exit(0),200);return;
 }
 const f={username:'rt'+Date.now(),password:crypto.randomBytes(24).toString('base64url'),purpose:'Synthetic login persistence acceptance 1.0.3'};
 const created=command(['user','create',f.username,'--password',f.password,'--type','externalUser']);f.id=(created.data??created).Data.Uid;if(!f.id)throw Error('Missing synthetic UID');fs.writeFileSync(path.join(base,'fixture.json'),JSON.stringify(f));
 const checks=[];try{
  for(const[device,step]of [['A','login'],['B','login'],['A','restore'],['B','restore'],['A','expire'],['B','restore']]){
   execFileSync(process.execPath,[__filename,'child',device,step],{cwd:root,stdio:['ignore','pipe','pipe'],windowsHide:true,timeout:60000});checks.push({name:`device ${device} ${step}`,passed:true});console.log(`device ${device} ${step}: passed`);
  }
  fs.writeFileSync('output/session103-cloud-report.json',JSON.stringify({checks,noBusinessWrites:true},null,2));
 }finally{if(!process.argv.includes('--keep')){command(['user','delete',f.id]);fs.writeFileSync(path.join(base,'deleted.json'),JSON.stringify({deleted:true}));}}
})().catch(()=>{console.error('Synthetic session acceptance failed; inspect private local fixture and cleanup before retry.');process.exit(1);});
