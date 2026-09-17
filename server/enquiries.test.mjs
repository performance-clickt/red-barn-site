import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEnquiryServer } from './enquiries.mjs';
const valid = { firstName:'Website', lastName:'Test', email:'test@example.com', subject:'Test enquiry', message:'Integration test', website:'' };
async function fixture(t, fetchImpl, extra={}) {
 const server=createEnquiryServer({captureUrl:'https://crm.example.com/api/v1/LeadCapture/test',origins:['https://site.example.com'],fetchImpl,...extra});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(()=>new Promise(r=>server.close(r)));
 const url=`http://127.0.0.1:${server.address().port}/api/enquiries`;
 return (body=valid,headers={})=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://site.example.com','Idempotency-Key':'test-request-12345678',...headers},body:JSON.stringify(body)});
}
test('maps fields and coalesces concurrent duplicate submissions',async t=>{
 let calls=0;
 const send=await fixture(t,async(url,options)=>{calls++;const data=JSON.parse(options.body);assert.equal(data.emailAddress,valid.email);assert.equal(data.firstName,valid.firstName);assert.match(data.description,/Integration test/);await new Promise(r=>setTimeout(r,30));return {ok:true};});
 const responses=await Promise.all([send(),send()]);
 for(const response of responses){assert.equal(response.status,200);assert.deepEqual(await response.json(),{success:true});}
 assert.equal(calls,1);
 assert.equal((await send({...valid,message:'Changed'})).status,409);
});
test('rejects untrusted origins, invalid fields and honeypot without contacting CRM',async t=>{
 const send=await fixture(t,()=>{assert.fail('CRM should not be called');});
 assert.equal((await send(valid,{Origin:'https://other.example.com'})).status,403);
 assert.equal((await send({...valid,email:'invalid'})).status,400);
 assert.equal((await send({...valid,website:'bot'})).status,400);
 assert.equal((await send({...valid,message:'x'.repeat(2001)})).status,400);
});
test('never reports success when CRM rejects or is unavailable; allows retry',async t=>{
 let calls=0;const send=await fixture(t,async()=>{calls++;if(calls===1)return {ok:false};throw new Error('offline');});
 assert.equal((await send()).status,502);assert.equal((await send()).status,502);assert.equal(calls,2);
});
test('fails closed without configuration',async t=>{
 const send=await fixture(t,()=>assert.fail('CRM should not be called'),{captureUrl:''});assert.equal((await send()).status,503);
});

test('limits repeated new requests per email while allowing other visitors',async t=>{
 const send=await fixture(t,async()=>({ok:true}));
 for(let i=0;i<3;i++)assert.equal((await send(valid,{'Idempotency-Key':`unique-request-000${i}`})).status,200);
 assert.equal((await send(valid,{'Idempotency-Key':'unique-request-0004'})).status,429);
 assert.equal((await send({...valid,email:'another@example.com'},{'Idempotency-Key':'unique-request-0005'})).status,200);
});
