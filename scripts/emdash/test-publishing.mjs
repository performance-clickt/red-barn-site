// Run only against the disposable local editor database, never a client deployment.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4323';
const setup=await (await fetch(origin+'/_emdash/api/setup/dev-bypass?token=1')).json();
const token=setup.data?.token;assert.ok(token,'Start a development server with a disposable database on port 4323 first.');
async function api(path,method='GET',data){const r=await fetch(origin+'/_emdash/api/'+path,{method,headers:{Authorization:`Bearer ${token}`,...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});const body=await r.json();assert.ok(r.ok&&body.success,JSON.stringify(body));return body.data;}
const publicHtml=()=>fetch(origin+'/').then(r=>r.text());
const original=(await api('content/homepage/main')).item.data;
const changed='EmDash publishing verification';
try {
 await api('content/homepage/main','PUT',{data:{...original,headline:changed}});
 assert.ok(!(await publicHtml()).includes(changed),'Draft leaked into public page');
 await api('content/homepage/main/publish','POST',{});
 assert.ok((await publicHtml()).includes(changed),'Published change missing');
 console.log('PASS: saved draft remains private; publishing changes the public page without rebuilding.');
} finally {await api('content/homepage/main','PUT',{data:original});await api('content/homepage/main/publish','POST',{});}
assert.ok(!(await publicHtml()).includes(changed));
const unauthorized=await fetch(origin+'/_emdash/api/content/homepage/main',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:{headline:changed}})});
assert.ok([401,403].includes(unauthorized.status));
console.log('PASS: unauthorized writes rejected; original content restored.');
const bytes=await fs.readFile('public/images/homepage/gallery/0/image.webp');
const form=new FormData();form.set('file',new Blob([bytes],{type:'image/webp'}),'cms-verification.webp');form.set('alt','Local CMS upload verification');
const r=await fetch(origin+'/_emdash/api/media',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form});const result=await r.json();assert.ok(r.ok&&result.success,JSON.stringify(result));
const item=result.data.item ?? result.data;const url=item.url || `/_emdash/api/media/file/${item.storageKey}`;
const download=await fetch(new URL(url,origin));assert.equal(download.status,200);assert.deepEqual(Buffer.from(await download.arrayBuffer()),bytes);
console.log('PASS: uploaded media is served unchanged from persistent storage.');
