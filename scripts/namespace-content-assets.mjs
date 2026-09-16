import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
// Each CMS entry owns its own images, so replacing a photo cannot delete another page's asset.
const assets=JSON.parse(await fs.readFile('migration/asset-manifest.json','utf8'));
for(const a of assets.filter(a=>a.optimized)){
 try{await fs.access('public'+a.optimized);}catch{await sharp('public'+a.url).resize({width:1600,withoutEnlargement:true}).webp({quality:85}).toFile('public'+a.optimized);}
}
async function copy(src,dest){await fs.mkdir(path.dirname('public'+dest),{recursive:true});if(src!==dest)await fs.copyFile('public'+src,'public'+dest);}
for(const bucket of ['pages','posts']){
 for(const filename of await fs.readdir(`src/content/${bucket}`)){
  if(!filename.endsWith('.mdoc'))continue;
  const slug=filename.slice(0,-5);const filepath=`src/content/${bucket}/${filename}`;
  let text=await fs.readFile(filepath,'utf8');
  const all=[...new Set([...text.matchAll(/\/images\/[^\s"')]+/g)].map(m=>m[0]))];
  for(const src of all){
   if(src.startsWith(`/images/${bucket}/${slug}/`))continue;
   const dest=`/images/${bucket}/${slug}/${path.basename(src)}`;await copy(src,dest);text=text.replaceAll(src,dest);
  }
  const hero=text.match(/^heroImage: "([^"]+)"/m)?.[1];
  if(hero){const target=`/images/${bucket}/${slug}/heroImage${path.extname(hero)}`;await copy(hero,target);text=text.replace(/^heroImage:.*$/m,`heroImage: "${target}"`);}
  await fs.writeFile(filepath,text);
 }
}
const homepage=JSON.parse(await fs.readFile('src/content/homepage.json','utf8'));
for(const [index,p]of homepage.gallery.entries()){
 const dest=`/images/homepage/gallery/${index}/image.webp`;await copy(p.image,dest);p.image=dest;
}
await fs.writeFile('src/content/homepage.json',JSON.stringify(homepage,null,2));
console.log('CMS image ownership isolated by collection and entry.');
