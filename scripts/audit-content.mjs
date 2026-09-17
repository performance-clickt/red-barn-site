import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
const inventory=JSON.parse(await fs.readFile('migration/content-inventory.json','utf8'));
const errors=[];let links=0,images=0,blocks=0;
const normalize=s=>s.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g,'');
for(const p of inventory){
 if(['home','about','cart'].includes(p.slug))continue;
 const route=p.slug==='index'?'':p.slug;
 const file=path.join('dist',route,'index.html');
 let html;try{html=await fs.readFile(file,'utf8')}catch{errors.push({route,error:'Missing output page'});continue;}
 const $=cheerio.load(html);$('script,style').remove();const text=normalize($('main').text());
 // Approved cleanup: About is consolidated into Our Story; Contact's imported placeholder copy is replaced.
 if(p.slug==='about'&&!$('meta[http-equiv=refresh]').attr('content')?.includes('/our-story/'))errors.push({route,error:'About redirect missing'});
 if(p.slug==='contact'){
  if(/email@example\.com|555-555|storage option/.test($('main').text()))errors.push({route,error:'Contact placeholder remains'});
  if(!$('main a[href="mailto:info@redbarninvestmentcounsel.ca"]').length)errors.push({route,error:'Contact email missing'});
 }
 for(const block of (['about','contact'].includes(p.slug)?[]:p.sourceBlocks)){
  if(normalize(block).length<60)continue;
  blocks++;
  // Homepage CTA was intentionally rewritten; its invitation sentence is retained.
  // Values Reflection is now self-hosted with local-only results and PDF export.
  // Replace only the retired quiz/email claims; retain all other source checks.
  if(p.slug==='financial-reflection' && block.startsWith('Discover what matters most')) {
   if(!text.includes(normalize('Discover the values that guide your financial decisions.')))errors.push({route,error:'Reflection introduction missing'});
   continue;
  }
  let compared = ['index','home'].includes(p.slug) ? block.replace(/^Book an intro call/, '') : block;
  if(['index','home','growing','harvest'].includes(p.slug)) {
   compared=compared.replace('Personalized “values profile” emailed to you (with conversation prompts)', 'Personalized “values profile” to download (with conversation prompts)');
   if(compared==='We’ll email your results and occasional insights. You can unsubscribe anytime.') compared='View your results instantly and download your reflection. Your answers stay in your browser; taking the reflection does not subscribe you to emails.';
  }
  if(!text.includes(normalize(compared)))errors.push({route,error:'Source paragraph missing or changed',text:block.slice(0,140)});
 }
 for(const el of $('a[href],img[src]').toArray()){
  const image=el.name==='img';const url=$(el).attr(image?'src':'href');if(image)images++;else links++;
  if(!url?.startsWith('/')||url.startsWith('//'))continue;
  const pathname=decodeURI(url.split(/[?#]/)[0]);const dest=path.join('dist',pathname);
  let found=false;for(const f of [dest,path.join(dest,'index.html')]){try{if((await fs.stat(f)).isFile())found=true;}catch{}}
  if(!found)errors.push({route,error:image?'Missing image':'Broken internal link',url});
 }
}
for(const p of ['dist/keystatic','dist/api/keystatic']){try{await fs.access(p);errors.push({error:'Admin routes present in production',path:p});}catch{}}
const result={pages:inventory.length,paragraphsChecked:blocks,linksChecked:links,imagesChecked:images,errors};
await fs.writeFile('migration/content-audit.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(errors.length)process.exitCode=1;
