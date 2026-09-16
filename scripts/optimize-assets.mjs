import fs from 'node:fs/promises';
import sharp from 'sharp';
const assets=JSON.parse(await fs.readFile('migration/asset-manifest.json','utf8'));
const replacements=[];
for(const a of assets.filter(a=>a.image)){
 const src='public'+a.url; const target=a.url.replace(/\.[a-z0-9]+$/i,'')+'.webp';
 if(target!==a.url){await sharp(src).resize({width:1600,withoutEnlargement:true}).webp({quality:85}).toFile('public'+target);replacements.push([a.url,target]);a.optimized=target;}
}
async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())await walk(p);else if(/\.(mdoc|json)$/.test(p)){let t=await fs.readFile(p,'utf8');for(const[a,b]of replacements)t=t.replaceAll(a,b);await fs.writeFile(p,t);}}}
await walk('src/content');
let inventory=await fs.readFile('migration/content-inventory.json','utf8');for(const[a,b]of replacements)inventory=inventory.replaceAll(a,b);await fs.writeFile('migration/content-inventory.json',inventory);
await fs.writeFile('migration/asset-manifest.json',JSON.stringify(assets,null,2));
console.log('Optimized',replacements.length,'images');
