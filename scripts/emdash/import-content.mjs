import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { Kysely } from 'kysely';
import { createDialect } from 'emdash/db/sqlite';
import { runMigrations } from 'emdash/db';
import { applySeed, validateSeed } from 'emdash/seed';
import { MediaRepository, OptionsRepository, SchemaRegistry, handleMediaUsageActivationAdvance, handleMediaUsageRepair } from 'emdash';

const directory=path.resolve(process.env.EMDASH_DATA_DIR || './data');
await fs.mkdir(directory,{recursive:true});
const db=new Kysely({dialect:createDialect({url:`file:${directory}/emdash.db`})});
try {
 await runMigrations(db);
 const options=new OptionsRepository(db);
 const marker='redbarn:keystatic_import_v1';
 let active=false;
 for(let step=0;step<100;step++){
  const result=await handleMediaUsageActivationAdvance(db,{writersDrained:true});
  if(!result.success)throw new Error(JSON.stringify(result.error));
  if(result.data.outcome==='active'){active=true;break;}
 }
 if(!active)throw new Error('Media index activation did not finish');
 if(await options.get(marker)){console.log('Red Barn content already imported; preserving CMS edits.');process.exitCode=0;}
 else {
  const existing=await db.selectFrom('_emdash_collections').select('slug').execute();
  if(existing.length) throw new Error('Database already contains collections. Import requires an empty database; no existing content was changed.');
  const seed=JSON.parse(await fs.readFile('seed/red-barn.json','utf8'));
  const media=new MediaRepository(db);const registered=new Map();
  async function register(url,alt='') {
   if(!url.startsWith('/images/') && !url.startsWith('/files/')) return {id:url,src:url,alt,provider:'external'};
   if(registered.has(url)) return {...registered.get(url),alt};
   const bytes=await fs.readFile(path.join('public',url));
   const hash=crypto.createHash('sha256').update(bytes).digest('hex');
   const ext=path.extname(url).toLowerCase();const mimeType=ext==='.pdf'?'application/pdf':ext==='.png'?'image/png':ext==='.svg'?'image/svg+xml':ext==='.webp'?'image/webp':'image/jpeg';
   const metadata=mimeType.startsWith('image/')?await sharp(bytes).metadata():{};
   const storageKey=`legacy/${hash}${ext}`;
   await fs.mkdir(path.join(directory,'uploads','legacy'),{recursive:true});
   await fs.writeFile(path.join(directory,'uploads',storageKey),bytes);
   const old=await media.findByContentHash(hash);
   const item=old || await media.create({filename:path.basename(url),mimeType,size:bytes.length,width:metadata.width,height:metadata.height,alt,storageKey,contentHash:hash});
   const value={id:item.id,src:url,alt,width:metadata.width,height:metadata.height,provider:'local',filename:item.filename,mimeType,meta:{storageKey}};
   registered.set(url,value);return value;
  }
  async function resolve(value) {
   if(Array.isArray(value)) {const result=[];for(const item of value)result.push(await resolve(item));return result;}
   if(!value || typeof value!=='object') return value;
   if(value.$legacyMedia) return register(value.$legacyMedia,value.alt);
   if(value._type==='image' && value.asset?.url) {
    const m=await register(value.asset.url,value.alt);
    return {...value,asset:{_type:'reference',_ref:m.id,url:m.src,provider:m.provider},width:m.width,height:m.height};
   }
   const result={};for(const [k,v] of Object.entries(value))result[k]=await resolve(v);return result;
  }
  seed.content=await resolve(seed.content);
  // Make all existing site images and PDFs available in the media library.
  async function walk(dir) {for(const ent of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory())await walk(p);else if(/\.(webp|png|jpg|jpeg|svg|pdf)$/i.test(p))await register('/'+p.replace(/^public\//,''));}}
  await walk('public/images');await walk('public/files');
  const validation=validateSeed(seed);if(!validation.valid)throw new Error(JSON.stringify(validation.errors));
  const result=await applySeed(db,seed,{includeContent:true,onConflict:'error'});
  await options.set(marker,{importedAt:new Date().toISOString(),sourceCommit:'b18805f',entries:Object.values(seed.content).flat().length,assets:registered.size});
  console.log(JSON.stringify({imported:result.content,assets:registered.size}));
 }
 // Versioned schema-only correction; never replaces editorial content.
 if(!(await options.get('redbarn:singleton_routes_v1'))){
  const schema=new SchemaRegistry(db);
  for(const [slug,urlPattern] of Object.entries({homepage:'/',settings:'/',insights_settings:'/insights'}))await schema.updateCollection(slug,{urlPattern,routable:true});
  await options.set('redbarn:singleton_routes_v1',true);
 }
 await options.set('emdash:seed_complete',true);
 if(!(await options.get('redbarn:media_index_v1'))){
  const repair=await handleMediaUsageRepair(db,{scope:'all'});
  if(!repair.success || repair.data.status!=='complete')throw new Error('Media indexing failed: '+JSON.stringify(repair));
  await options.set('redbarn:media_index_v1',true);
 }
} finally {await db.destroy();}
