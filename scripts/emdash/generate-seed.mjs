import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import Markdoc from '@markdoc/markdoc';
import * as cheerio from 'cheerio';
import { parse } from 'yaml';
import { prosemirrorToPortableText } from 'emdash';
import { validateSeed } from 'emdash/seed';
import { renderRichText } from '../../src/lib/cms-rich-text.mjs';
const snake = s => s.replace(/[A-Z]/g, x => '_'+x.toLowerCase());
const label = s => s.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase());
const field = (slug, type='string', extra={}) => ({slug:snake(slug),label:label(slug),type,...extra});
const collection = (slug,label,fields,urlPattern) => ({slug,label,titleField:'title',supports:['drafts','revisions','preview','scheduling','search'],routable:!!urlPattern,...(urlPattern?{urlPattern}:{}),fields});
const asset = (url, alt='') => url ? {$legacyMedia:url,alt} : null;
function richText(html) {
 const $=cheerio.load(html,null,false);
 function inline(n, marks=[]) {
  if(n.type==='text') return [{type:'text',text:n.data, ...(marks.length?{marks}:{})}];
  if(n.name==='br') return [{type:'hardBreak'}];
  const types={strong:'bold',em:'italic',s:'strike',u:'underline',code:'code',a:'link'};
  const next=types[n.name] ? [...marks,{type:types[n.name],...(n.name==='a'?{attrs:{href:n.attribs.href,...(n.attribs.title?{title:n.attribs.title}:{})}}:{})}] : marks;
  return (n.children||[]).flatMap(c=>inline(c,next));
 }
 function block(n) {
  const html=$.html(n);
  if(/^h[1-6]$/.test(n.name)) return {type:'heading',attrs:{level:Number(n.name[1])},content:n.children.flatMap(c=>inline(c))};
  if(n.name==='p' && $(n).children('img').length===1 && $(n).text()==='') {
   const img=$(n).children('img')[0];return {type:'image',attrs:{...img.attribs}};
  }
  if(n.name==='p' && !$(n).find('img').length) return {type:'paragraph',content:n.children.flatMap(c=>inline(c))};
  if(['ul','ol'].includes(n.name) && !$(n).find('p,ul,ol').length) return {type:n.name==='ul'?'bulletList':'orderedList',content:$(n).children('li').toArray().map(li=>({type:'listItem',content:[{type:'paragraph',content:li.children.flatMap(c=>inline(c))}]}))};
  // Preserve multi-paragraph biographies and other compound structures in an editable HTML block.
  return {type:'htmlBlock',attrs:{html}};
 }
 const canonical=h=>cheerio.load(h,null,false).html();
 const blocks=$.root().children().toArray().flatMap(n=>{
  const converted=prosemirrorToPortableText({type:'doc',content:[block(n)]});
  return canonical(renderRichText(converted))===canonical($.html(n)) ? converted : [{_type:'htmlBlock',_key:crypto.createHash('sha256').update($.html(n)).digest('hex').slice(0,16),html:$.html(n)}];
 });
 if(canonical(renderRichText(blocks))!==canonical(html)) {const a=canonical(html),b=canonical(renderRichText(blocks));let i=0;while(a[i]===b[i] && i<a.length)i++;throw new Error('HTML difference at '+i+' ORIGINAL '+a.slice(Math.max(0,i-80),i+250)+' RENDERED '+b.slice(Math.max(0,i-80),i+250));}
 return blocks;
}
const base=[field('title','string',{required:true}),field('seoTitle'),field('h1'),field('description','text'),field('heroImage','image'),field('heroAlt'),field('sourceUrl','url'),field('content','portableText')];
const seed={version:'1',defaultLocale:'en',meta:{name:'Red Barn migration from b18805f'},settings:{title:'Red Barn Investment Counsel',timezone:'America/Edmonton'},collections:[collection('pages','Website pages',base,'/{slug}'),collection('posts','Insights',[...base,field('date'),field('author')],'/insights/{slug}')],content:{}};
const originals={};
for(const name of ['pages','posts']) {
 seed.content[name]=[];
 for(const file of (await fs.readdir(`src/content/${name}`)).sort()) {
  const source=await fs.readFile(`src/content/${name}/${file}`,'utf8');
  const ast=Markdoc.parse(source);const data=parse(ast.attributes.frontmatter);
  const html=Markdoc.renderers.html(Markdoc.transform(ast)).replace(/^<article>/,'').replace(/<\/article>$/,'');
  const content=richText(html);
  const slug=file.replace(/\.mdoc$/,'');originals[`${name}/${slug}`]=html;
  const mapped=Object.fromEntries(Object.entries(data).map(([k,v])=>[snake(k),k==='heroImage'?asset(v,data.heroAlt):v]));
  seed.content[name].push({id:`${name}-${slug}`,slug,status:'published',data:{...mapped,content}});
 }
}
for(const name of ['homepage','settings','insights']) {
 const data=JSON.parse(await fs.readFile(`src/content/${name}.json`,'utf8'));
 const rows={familyTakeaways:'Takeaway',pillars:'Pillar',quizBenefits:'Benefit'};
 const fields=[field('title','string',{required:true})]; const values={title: name==='settings'?'Contact & site settings':label(name)};
 for(const [key,value] of Object.entries(data)) {
  if(Array.isArray(value)) {
   const sub=key==='gallery'?[field('image','image'),field('alt')]:rows[key]?[field('text','text')]:[field('title'),field('body','text')];
   fields.push(field(key,'repeater',{validation:{subFields:sub,...(key==='gallery'?{minItems:5,maxItems:5}:{})}}));
   values[snake(key)]=value.map(v=>typeof v==='string'?{text:v}:key==='gallery'?{image:asset(v.image,v.alt),alt:v.alt}:v);
  } else {fields.push(field(key,key.endsWith('Url')?'url':value.length>100?'text':'string'));values[snake(key)]=value;}
 }
 const cmsName=name==='insights'?'insights_settings':name;
 seed.collections.push(collection(cmsName,name==='settings'?'Contact & site settings':name==='insights'?'Insights listing':'Homepage',fields,name==='insights'?'/insights':'/'));
 seed.content[cmsName]=[{id:cmsName+'-main',slug:'main',status:'published',data:values}];
}
// Validation runs again after local media references are resolved during import.
const check=validateSeed(seed);if(!check.valid) throw new Error(JSON.stringify(check.errors));
await fs.writeFile('seed/model.json',JSON.stringify({...seed,content:{}},null,2)+'\n');
await fs.writeFile('seed/red-barn.json',JSON.stringify(seed,null,2)+'\n');
await fs.writeFile('tests/emdash/original-html.json',JSON.stringify(originals,null,2)+'\n');
console.log(`Generated ${Object.values(seed.content).flat().length} entries; all 32 article bodies preserve their original HTML.`);
