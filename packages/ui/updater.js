export function compareVersions(a,b){
 const parse=s=>{const m=String(s??'').replace(/^v/,'').match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/);return m?[+m[1],+m[2],+m[3],m[4]??'']:null;};
 const x=parse(a),y=parse(b);if(!x||!y)return 0;
 for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]<y[i]?-1:1;
 if(x[3]===y[3])return 0;if(!x[3])return 1;if(!y[3])return -1;
 return x[3].localeCompare(y[3],undefined,{numeric:true});
}
export function validateUpdateManifest(value,platform){
 const entry=value?.[platform];if(!entry||typeof entry.version!=='string'||typeof entry.url!=='string')return null;
 let url;try{url=new URL(entry.url);}catch{return null;}
 if(url.protocol!=='https:'||url.hostname!=='github.com'||!url.pathname.startsWith('/StuTuse/rater-tracker/releases'))return null;
 return{version:entry.version,url:url.href};
}
export async function checkUpdate(platform,current,fetcher=fetch){
 const response=await fetcher('https://raw.githubusercontent.com/StuTuse/rater-tracker/main/update-manifest.json',{cache:'no-store'});
 if(!response.ok)throw Error('更新检查暂不可用');const manifest=await response.json(),latest=validateUpdateManifest(manifest,platform);
 if(!latest||compareVersions(latest.version,current)<=0)return null;return latest;
}
