import { spawnSync } from 'node:child_process';
import { existsSync,readFileSync,writeFileSync,mkdirSync,copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { androidTools, verifyAndroidRelease } from './android-verify.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),project=path.join(root,'apps/android'),native=path.join(project,'android');
const tools=androidTools(root),java=tools.javaHome;
const temp=process.env.RATER_ANDROID_TMP??path.join(root,'runtime-data/android-tmp');
mkdirSync(temp,{recursive:true});
const androidUser=path.join(root,'runtime-data/android-user-home');mkdirSync(androidUser,{recursive:true});
const existingDebug=path.join(process.env.USERPROFILE??'', '.android/debug.keystore');if(!existsSync(path.join(androidUser,'debug.keystore'))&&existsSync(existingDebug))copyFileSync(existingDebug,path.join(androidUser,'debug.keystore'));
const buildEnv={...process.env,ANDROID_USER_HOME:androidUser,JAVA_HOME:java,ANDROID_HOME:tools.sdk,ANDROID_SDK_ROOT:tools.sdk,
 GRADLE_USER_HOME:process.env.GRADLE_USER_HOME??path.join(root,'runtime-data/android-gradle-home'),TEMP:temp,TMP:temp};
function run(exe,args,cwd=project){const r=spawnSync(exe,args,{cwd,stdio:'inherit',windowsHide:true,env:buildEnv});if(r.status!==0)throw Error('构建步骤失败: '+exe);}
const git=spawnSync('git',['rev-parse','--path-format=absolute','--git-common-dir'],{cwd:root,encoding:'utf8'});const primaryRoot=git.status===0?path.dirname(git.stdout.trim()):root;
const signing=process.env.RATER_ANDROID_SIGNING_DIR?path.resolve(process.env.RATER_ANDROID_SIGNING_DIR):path.join(primaryRoot,'runtime-data/android-signing');mkdirSync(signing,{recursive:true});
const config=path.join(signing,'signing.json');
if(!existsSync(config))throw Error('缺少既有正式签名配置；请恢复原签名材料，不自动生成替代密钥。');
const signingConfig=JSON.parse(readFileSync(config,'utf8'));
if(!signingConfig.file||!existsSync(signingConfig.file)||!signingConfig.alias||!signingConfig.password)throw Error('既有正式签名配置不完整；停止构建。');
run(process.execPath,[path.join(root,'scripts/android-web.mjs')]);
run(process.execPath,['node_modules/@capacitor/cli/bin/capacitor','sync','android']);
const props=[];if(process.env.RATER_BUILD_PROXY){const p=new URL(process.env.RATER_BUILD_PROXY);for(const scheme of ['http','https'])props.push('-D'+scheme+'.proxyHost='+p.hostname,'-D'+scheme+'.proxyPort='+p.port);}
run(path.join(java,'bin/java.exe'),[...props,'-classpath',path.join(native,'gradle/wrapper/gradle-wrapper.jar'),'org.gradle.wrapper.GradleWrapperMain','assembleDebug','assembleRelease',...(process.argv.includes('--instrument')?[':app:assembleDebugAndroidTest']:[]),'--console=plain','--no-daemon','-Pandroid.builder.sdkDownload=true','-PraterSigningFile='+config,...props],native);
const releaseApk=path.join(native,'app/build/outputs/apk/release/app-release.apk');
const report=verifyAndroidRelease(releaseApk,root);
const version=readFileSync(path.join(project,'VERSION'),'utf8').trim();const dest=path.join(root,'release/android');mkdirSync(dest,{recursive:true});
for(const type of ['debug','release'])copyFileSync(path.join(native,'app/build/outputs/apk',type,'app-'+type+'.apk'),path.join(dest,'Rater-Tracker-Android-'+version+'-'+type+'.apk'));
const name='Rater-Tracker-Android-'+version+'-release.apk';
if(createHash('sha256').update(readFileSync(path.join(dest,name))).digest('hex')!==report.sha256)throw Error('正式APK复制校验失败；不可发布。');
writeFileSync(path.join(dest,'Rater-Tracker-Android-'+version+'-verification.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(path.join(dest,'SHA256.txt'),report.sha256+' *'+name+'\n');
console.log(JSON.stringify(report,null,2));
console.log('Installable APKs: '+dest);
