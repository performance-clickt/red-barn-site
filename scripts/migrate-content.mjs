import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
const root=path.resolve(import.meta.dirname,'..');
const source=path.join(root,'migration/source');
const manifest=JSON.parse(await fs.readFile(path.join(root,'migration/fetch-manifest.json'),'utf8'));
const assets=new Map();
function asset(url){
 if(!url)return '';
 url=url.startsWith('//')?'https:'+url:new URL(url,'https://www.redbarninvestmentcounsel.ca').href;
 const u=new URL(url);u.search='';
 if(!assets.has(u.href)){
  const ext=path.extname(decodeURIComponent(u.pathname)).toLowerCase();
  const isImage=/\.(png|jpg|jpeg|webp|gif)$/.test(ext)||u.hostname.includes('images.squarespace');
  const name=decodeURIComponent(u.pathname).split('/').pop().replace(/[^a-zA-Z0-9.-]/g,'-').slice(0,65);
  assets.set(u.href,{source:u.href,url:`/${isImage?'images':'files'}/${crypto.createHash('sha256').update(u.href).digest('hex').slice(0,10)}-${name}${isImage?'':' '}`.trim(),image:isImage});
 }
 return assets.get(u.href).url;
}
const td=new TurndownService({headingStyle:'atx',bulletListMarker:'-'});
td.addRule('empty-link',{filter:n=>n.nodeName==='A'&&!n.textContent.trim()&&!n.querySelector('img'),replacement:()=>''});
const index=[];
for(const item of manifest){
 if(item.error)continue;
 const html=await fs.readFile(path.join(source,item.slug.replaceAll('/','__')+'.html'),'utf8');
 const $=cheerio.load(html);
 const title=$('meta[property="og:title"]').attr('content')?.replace(/\s*[—–|]\s*Red Barn.*$/,'').trim()||$('title').text();
 const description=$('meta[name="description"]').attr('content')?.trim()||'';
 const main=$('#page');
 const sourceBlocks=main.find('.sqs-html-content,.accordion-item__description,.list-item-content__description').map((_,e)=>$(e).text().replace(/\s+/g,' ').trim()).get().filter(Boolean);
 const embeds=[...html.matchAll(/<iframe\s[^>]*src="([^"]+)"[^>]*>/g)].map(m=>m[1]);
 const videos=main.find('[data-config-video]').map((_,e)=>({video:JSON.parse($(e).attr('data-config-video')),thumbnail:JSON.parse($(e).attr('data-config-thumbnail')||'{}')})).get();
 main.find('script,style,noscript,svg,.sqs-block-form,.blog-item-pagination,.blog-meta-item--author,.blog-author-profile').remove();
 main.find('template').remove();
 main.find('img').each((_,e)=>{
  const el=$(e);const url=el.attr('data-src')||el.attr('src');
  if(!url||/Bckgrd|White\.jpg|Icon\d|Red\+Barn\+Roof|Red%20Barn%20Roof/i.test(url)){el.remove();return;}
  el.attr('src',asset(url));el.removeAttr('srcset');
  if(!el.attr('alt'))el.attr('alt',el.attr('data-image-title')||'');
 });
 main.find('a[href]').each((_,e)=>{const el=$(e);let href=el.attr('href');if(href?.startsWith('https://www.redbarninvestmentcounsel.ca'))href=href.replace('https://www.redbarninvestmentcounsel.ca','')||'/';if(href?.startsWith('/s/'))href=asset(href);if(href)el.attr('href',href)});
 const images=main.find('img').map((_,e)=>({src:$(e).attr('src'),alt:$(e).attr('alt')||''})).get();
 main.find('h1').each((_,e)=>{const el=$(e);el.replaceWith(`<h2>${el.html()}</h2>`)});
 // Squarespace's UI chrome is intentionally discarded; the authored body is kept.
 const body=td.turndown(main.html()||'').replace(/\n{3,}/g,'\n\n').trim();
 const article = $('script[type="application/ld+json"]').map((_,e)=>{try{return JSON.parse($(e).text())}catch{return null}}).get().find(a=>a?.datePublished);
 const date=article?.datePublished?.slice(0,10)||'';
 const entry={slug:item.slug,title,description,source:item.url,body,images,embeds,videos,date,sourceBlocks};
 index.push(entry);
 if(['index','home','insights'].includes(item.slug))continue;
 const isPost=item.slug.startsWith('insights/');const slug=isPost?item.slug.slice(9):item.slug;
 const metadata={title,description,heroImage:images[0]?.src||'',heroAlt:images[0]?.alt||'',sourceUrl:item.url,...(isPost?{date,author:'Greg Flower'}:{})};
 await fs.writeFile(path.join(root,`src/content/${isPost?'posts':'pages'}/${slug}.mdoc`),'---\n'+Object.entries(metadata).map(([k,v])=>`${k}: ${JSON.stringify(v)}`).join('\n')+'\n---\n\n'+body+'\n');
}
const $=cheerio.load(await fs.readFile(path.join(source,'index.html'),'utf8'));
asset($('header img').first().attr('src'));
await fs.writeFile(path.join(root,'migration/content-inventory.json'),JSON.stringify(index,null,2));
await fs.writeFile(path.join(root,'migration/asset-manifest.json'),JSON.stringify([...assets.values()],null,2));
console.log(`Prepared ${index.length} source pages, ${index.filter(x=>x.slug.startsWith('insights/')).length} articles and ${assets.size} assets.`);
