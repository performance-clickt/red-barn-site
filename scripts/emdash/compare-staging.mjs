import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
const reference=process.env.REFERENCE_URL || 'https://redbarn-preview.91.98.31.168.sslip.io';
const candidate=process.env.CANDIDATE_URL || 'http://127.0.0.1:4322';
const baselineDir=process.env.QA_BASELINE_DIR;
const captureBaseline=process.env.QA_CAPTURE_BASELINE==='1';
if(captureBaseline&&!baselineDir)throw new Error('QA_BASELINE_DIR is required when capturing a baseline');
if(captureBaseline)await fs.mkdir(baselineDir,{recursive:true});
const output=process.env.QA_OUTPUT || 'test-results/emdash-visual';await fs.mkdir(output,{recursive:true});
const seed=JSON.parse(await fs.readFile('seed/red-barn.json','utf8'));
const allRoutes=['/','/insights',...seed.content.pages.map(p=>'/'+p.slug),...seed.content.posts.map(p=>'/insights/'+p.slug)];
const routes=process.env.QA_ROUTES ? allRoutes.filter(r=>process.env.QA_ROUTES.split(',').includes(r)) : allRoutes;
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-gpu','--force-color-profile=srgb']});const report=[];
try {
 for(const width of [1440,390]) {
  const contextOptions={viewport:{width,height:width===390?844:1000},deviceScaleFactor:1,locale:'en-CA',timezoneId:'America/Edmonton',reducedMotion:'reduce'};
  for(const route of routes) {
   const errors=[];
   const baselineName=`${width}-${route==='/'?'home':encodeURIComponent(route)}.png`;
   const buffers=[];for(let i=0;i<2;i++){
    if(i===0&&baselineDir&&!captureBaseline){buffers.push(await fs.readFile(path.join(baselineDir,baselineName)));continue;}
    if(i===1&&captureBaseline){buffers.push(buffers[0]);continue;}
    const context=await browser.newContext(contextOptions);const page=await context.newPage();
    const response=await page.goto((i?candidate:reference)+route,{waitUntil:'networkidle'});
    if(response.status()!==200)errors.push(`${i?'candidate':'reference'} HTTP ${response.status()}`);
    await page.evaluate(async()=>{
     await document.fonts.ready;
     for(const img of document.images){img.loading='eager';}
     await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));
     document.querySelectorAll('video').forEach(v=>v.pause());
    });
    await page.screenshot({fullPage:true,animations:'disabled'});
    await page.waitForTimeout(600);
    const broken=await page.evaluate(()=>[...document.images].filter(img=>!img.complete || !img.naturalWidth).map(img=>img.currentSrc || img.src));
    if(broken.length)errors.push(`${i?'candidate':'reference'} unloaded images: ${broken.join(', ')}`);
    buffers.push(await page.screenshot({fullPage:true,animations:'disabled'}));
    if(i===0&&captureBaseline)await fs.writeFile(path.join(baselineDir,baselineName),buffers[0]);
    await context.close();
   }
   const decoded=await Promise.all(buffers.map(b=>sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true})));
   const [a,b]=decoded;let changedPixels=0,maxDifference=0;
   const equalSize=a.info.width===b.info.width&&a.info.height===b.info.height;
   if(equalSize)for(let i=0;i<a.data.length;i+=4){let changed=false;for(let c=0;c<3;c++){const d=Math.abs(a.data[i+c]-b.data[i+c]);if(d){changed=true;maxDifference=Math.max(d,maxDifference);}}if(changed)changedPixels++;}
   const row={route,width,referenceSize:a.info,candidateSize:b.info,equalSize,changedPixels,maxDifference,errors};report.push(row);
   if(!equalSize||changedPixels||errors.length){const name=`${width}-${route.replaceAll('/','_')||'home'}`;await fs.writeFile(path.join(output,name+'-reference.png'),buffers[0]);await fs.writeFile(path.join(output,name+'-emdash.png'),buffers[1]);}
   console.log(JSON.stringify({route,width,equalSize,changedPixels,maxDifference,errors}));
  }
 }
} finally {await browser.close();await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));}
if(report.some(r=>!r.equalSize||r.changedPixels||r.errors.length))process.exitCode=1;
