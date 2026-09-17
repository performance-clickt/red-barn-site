import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as cheerio from 'cheerio';
const origin=process.argv[2];
const pages=JSON.parse(await fs.readFile('migration/seo/approved-metadata.json','utf8'));
const canonical='https://www.redbarninvestmentcounsel.ca';
const articleSources=JSON.parse(await fs.readFile('migration/seo/article-sources.json','utf8'));
let headings=[];
for(const p of pages){
 const html=origin?await (async()=>{let r=await fetch(origin+p.path,{redirect:'manual'});assert.equal(r.status,200,p.path);assert.match(r.headers.get('x-robots-tag')||'',/noindex/);return r.text()})():await fs.readFile(`dist${p.path==='/'?'':p.path}/index.html`,'utf8');
 const $=cheerio.load(html);assert.doesNotMatch($('main').text(),/We’ll email your results|values profile.*emailed to you/i,p.path);assert.equal($('title').text(),p.title,p.path);assert.equal($('meta[name="description"]').attr('content'),p.description,p.path);assert.equal($('h1').length,1,p.path);assert.equal($('h1').text().trim(),p.h1,p.path);assert.equal($('link[rel="canonical"]').attr('href'),canonical+p.path,p.path);
 const schemas=$('script[type="application/ld+json"]').map((_,el)=>JSON.parse($(el).text())).get();
 if(p.path.startsWith('/insights/')){const source=articleSources.find(a=>a.source==='insights__'+p.path.split('/').at(-1)+'.html');const article=schemas.find(s=>s['@type']==='BlogPosting');assert.equal(article.author.name,source.author);assert.equal(article.datePublished,source.datePublished.slice(0,10));}
 let last=0;$('main').find('h1,h2,h3,h4,h5,h6').each((_,el)=>{let n=Number(el.tagName[1]);if(n>last+1)headings.push({path:p.path,heading:$(el).text(),from:last,to:n});last=n});
}
const xml=origin?await(await fetch(origin+'/sitemap.xml')).text():await fs.readFile('dist/sitemap.xml','utf8');const $=cheerio.load(xml,{xml:true});assert.deepEqual($('loc').map((_,el)=>$(el).text()).get().sort(),pages.map(p=>canonical+p.path).sort());
if(origin){
 for(const [p,target]of [['/home','/'],['/about','/our-story'],['/new-dropdown','/insights']])for(const suffix of['','/']){let r=await fetch(origin+p+suffix,{redirect:'manual'});assert.equal(r.status,301);assert.equal(r.headers.get('location'),target)}
 for(const [p,status] of [['/cart',410],['/horizons',404],['/not-a-real-page',404]])assert.equal((await fetch(origin+p)).status,status,p);
 assert.match(await(await fetch(origin+'/robots.txt')).text(),/Disallow: \//);
 for(const r of JSON.parse(await fs.readFile('migration/seo/resources.json','utf8'))){let response=await fetch(origin+r.path);assert.equal(response.status,200,r.path);const hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(await fs.readFile('public'+r.local)),r.path);if(r.path.endsWith('.pdf'))for(const path of [r.path,r.local])assert.equal((await fetch(origin+path,{method:'HEAD'})).headers.get('link'),`<${canonical+r.path}>; rel="canonical"`);}
}
assert.equal(headings.length,0,'Heading hierarchy skips: '+JSON.stringify(headings));
console.log(JSON.stringify({pages:pages.length,metadata:'pass',sitemap:'pass',http:origin?'pass':'not run',headingJumps:headings},null,2));
