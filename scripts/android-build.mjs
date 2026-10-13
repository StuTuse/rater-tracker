import { spawnSync } from 'node:child_process';
import { readdirSync,existsSync,readFileSync,writeFileSync,mkdirSync,copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),project=path.join(root,'apps/android'),native=path.join(project,'android');
const tools=path.join(root,'runtime-data/toolchains');
const java=process.env.RATER_JAVA_HOME??path.join(tools,(existsSync(tools)?readdirSync(tools):[]).find(n=>n.startsWith('jdk-'))??'jdk21');
if(!existsSync(path.join(java,'bin/java.exe')))throw Error('设置 RATER_JAVA_HOME 为 JDK21 或解压 JDK21 到 runtime-data/toolchains。');
function run(exe,args,cwd=project){const r=spawnSync(exe,args,{cwd,stdio:'inherit',env:{...process.env,JAVA_HOME:java}});if(r.status!==0)throw Error('构建步骤失败: '+exe);}
run(process.execPath,[path.join(root,'scripts/android-web.mjs')]);
run(process.execPath,['node_modules/@capacitor/cli/bin/capacitor','sync','android']);
const git=spawnSync('git',['rev-parse','--path-format=absolute','--git-common-dir'],{cwd:root,encoding:'utf8'});const primaryRoot=git.status===0?path.dirname(git.stdout.trim()):root;
const signing=process.env.RATER_ANDROID_SIGNING_DIR?path.resolve(process.env.RATER_ANDROID_SIGNING_DIR):path.join(primaryRoot,'runtime-data/android-signing');mkdirSync(signing,{recursive:true});
const key=path.join(signing,'rater-tracker.jks'),config=path.join(signing,'signing.json');
if(!existsSync(config)){
 if(existsSync(key))throw Error('签名密钥已存在但配置缺失；保留原密钥并恢复配置。');
 const pass=randomBytes(32).toString('base64url');const passfile=path.join(signing,'password.txt');writeFileSync(passfile,pass,{mode:0o600});
 run(path.join(java,'bin/keytool.exe'),['-genkeypair','-keystore',key,'-storepass:file',passfile,'-keypass:file',passfile,'-alias','rater','-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=Rater Tracker local, O=TuseCreation'],root);
 writeFileSync(config,JSON.stringify({file:key,password:pass,alias:'rater'}),{mode:0o600});
}
const props=[];if(process.env.RATER_BUILD_PROXY){const p=new URL(process.env.RATER_BUILD_PROXY);for(const scheme of ['http','https'])props.push('-D'+scheme+'.proxyHost='+p.hostname,'-D'+scheme+'.proxyPort='+p.port);}
run(path.join(java,'bin/java.exe'),[...props,'-classpath',path.join(native,'gradle/wrapper/gradle-wrapper.jar'),'org.gradle.wrapper.GradleWrapperMain','assembleDebug','assembleRelease','--console=plain','--no-daemon','-Pandroid.builder.sdkDownload=true','-PraterSigningFile='+config,...props],native);
const version=readFileSync(path.join(project,'VERSION'),'utf8').trim();const dest=path.join(root,'release/android');mkdirSync(dest,{recursive:true});
for(const type of ['debug','release'])copyFileSync(path.join(native,'app/build/outputs/apk',type,'app-'+type+'.apk'),path.join(dest,'Rater-Tracker-Android-'+version+'-'+type+'.apk'));
console.log('Installable APKs: '+dest);
