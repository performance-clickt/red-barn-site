import * as cheerio from 'cheerio';
import fs from 'node:fs';
let manifest;
export function optimizeHtml(html) {
 manifest ||= JSON.parse(fs.readFileSync(`${process.cwd()}/public/optimized/manifest.json`,'utf8'));
 const $=cheerio.load(html);
 $('img[src]').each((_,el)=>{
  const img=$(el);if(img.closest('astro-island').length)return;
  const image=manifest[img.attr('src')];if(!image)return;
  if(!img.attr('width')&&!img.attr('height'))img.attr('width',String(image.width)).attr('height',String(image.height));
  let sizes='(max-width: 640px) 90vw, (max-width: 1024px) 88vw, 1200px';
  if(img.closest('.brand').length)sizes='(max-width: 640px) 185px, 300px';
  else if(img.closest('.family-photo,.values-section,.investment-detail,.advisor-section').length)sizes='(max-width: 640px) 90vw, 45vw';
  else if(img.closest('.season').length)sizes='(max-width: 1024px) 45vw, 24vw';
  if(img.attr('loading')==='lazy')sizes='auto, '+sizes;
  const fallback=image.variants.find(v=>v.width>=960)||image.variants.at(-1);
  img.attr('src',fallback.src).attr('srcset',image.variants.map(v=>`${v.src} ${v.width}w`).join(', ')).attr('sizes',sizes);
 });
 return $.html();
}
