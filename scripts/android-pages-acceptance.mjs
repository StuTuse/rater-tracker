import {readFileSync} from 'node:fs';
export default async function pages(page){
 let code=readFileSync('scripts/pages-acceptance.cjs','utf8');
 function replace(from,to){if(!code.includes(from))throw Error('Native page adapter source changed: '+from);code=code.replace(from,to);}
 replace("await page.getByRole('button',{name:label,exact:true}).click();\n      const sample", "await page.evaluate(()=>window.__freezeNextPageEnter=true);await page.getByRole('button',{name:label,exact:true}).click();\n      const sample");
 replace("const fresh=()=>page.evaluate(()=>document.querySelector('#content').getAnimations({subtree:true}).filter(a=>a.id==='page-enter').length);", "const fresh=()=>page.evaluate(()=>{const a=document.querySelector('#content').getAnimations({subtree:true}).filter(a=>a.id==='page-enter');const count=a.length;a.forEach(x=>{if(x.playState==='paused')x.play();});return count;});");
 replace("await page.getByRole('button',{name:label,exact:true}).click();\n      report['badge-'+label]", "await page.evaluate(()=>window.__freezeNextPageEnter=true);await page.getByRole('button',{name:label,exact:true}).click();\n      report['badge-'+label]");
 replace("// Keep old animations to verify cancellation when reusing the same DOM nodes.\n    await page.getByRole", "// Keep old animations to verify cancellation when reusing the same DOM nodes.\n    await page.evaluate(()=>window.__freezeNextPageEnter=true);await page.getByRole");
 replace("await page.getByRole('button',{name:'任务',exact:true}).click();\n      report[mode", "await page.evaluate(mode=>window.__freezeNextPageEnter=mode!=='off',mode);await page.getByRole('button',{name:'任务',exact:true}).click();\n      report[mode");
 replace("},mode);await settle();", "},mode);await resume();await settle();");
 replace("await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole", "await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>window.__freezeNextPageEnter=true);await page.getByRole");
 replace(")));await settle();await page.emulateMedia", ")));await resume();await settle();await page.emulateMedia");
 return new Function('return ('+code+'\n)')()(page);
}
