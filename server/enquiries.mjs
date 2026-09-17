import http from 'node:http';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function createEnquiryServer({captureUrl=process.env.ESPO_LEAD_CAPTURE_URL,origins=(process.env.FORM_ALLOWED_ORIGINS||'').split(',').filter(Boolean),fetchImpl=fetch}={}){
 const attempts=new Map();
 const submissions=new Map();
 const emailAttempts=new Map();
 const reply=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 return http.createServer(async(req,res)=>{
  if(req.url==='/healthz'){reply(res,captureUrl&&origins.length?200:503,{ready:!!captureUrl&&!!origins.length});return;}
  if(req.url!=='/api/enquiries'){reply(res,404,{error:'Not found'});return;}
  if(req.method!=='POST'){reply(res,405,{error:'Use POST'});return;}
  if(!origins.includes(req.headers.origin)){reply(res,403,{error:'This form must be submitted from the Red Barn website.'});return;}
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')){reply(res,415,{error:'Invalid request format.'});return;}
  if(!captureUrl){reply(res,503,{error:'The form is temporarily unavailable. Please try again later.'});return;}
  const now=Date.now();
  for(const [key,value] of attempts)if(value.until<now)attempts.delete(key);
  for(const [key,value] of submissions)if(value.until<now)submissions.delete(key);
  // A bounded site-wide limit avoids trusting visitor-supplied proxy headers.
  const rate=attempts.get('site')||{count:0,until:now+60000};
  if(rate.count>=120){reply(res,429,{error:'Please wait a minute before trying again.'});return;}
  rate.count++;attempts.set('site',rate);
  let input;
  try{
   let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>12000){reply(res,413,{error:'Your message is too long.'});return;}}
   input=JSON.parse(body);
  }catch{reply(res,400,{error:'Please check your details and try again.'});return;}
  if(!input||typeof input!=='object'||Array.isArray(input)){reply(res,400,{error:'Invalid form details.'});return;}
  if(input.website){reply(res,400,{error:'Please check your details and try again.'});return;}
  const limits={firstName:100,lastName:100,email:254,subject:150,message:2000};
  const clean={};
  for(const [field,max] of Object.entries(limits)){
   if(typeof input[field]!=='string'||!input[field].trim()||input[field].length>max){reply(res,400,{error:'Please complete all fields and keep your message under 2,000 characters.'});return;}
   clean[field]=input[field].trim();
  }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)){reply(res,400,{error:'Please enter a valid email address.'});return;}
  const key=req.headers['idempotency-key'];
  if(typeof key!=='string'||!/^[a-zA-Z0-9-]{16,64}$/.test(key)){reply(res,400,{error:'Please refresh the page and try again.'});return;}
  const hash=createHash('sha256').update(JSON.stringify(clean)).digest('hex');
  const previous=submissions.get(key);
  if(previous){
   if(previous.hash!==hash){reply(res,409,{error:'Your details changed. Please submit again.'});return;}
   const result=await previous.result;reply(res,result.status,result.body);return;
  }
  for(const [key,value] of emailAttempts)if(value.until<now)emailAttempts.delete(key);
  const emailKey=createHash('sha256').update(clean.email.toLowerCase()).digest('hex');
  const emailRate=emailAttempts.get(emailKey)||{count:0,until:now+60000};
  if(emailRate.count>=3||emailAttempts.size>10000){reply(res,429,{error:'Please wait a minute before trying again.'});return;}
  emailRate.count++;emailAttempts.set(emailKey,emailRate);
  if(submissions.size>10000){reply(res,503,{error:'Please try again shortly.'});return;}
  const result=(async()=>{
   try{
    const response=await fetchImpl(captureUrl,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({firstName:clean.firstName,lastName:clean.lastName,emailAddress:clean.email,description:`Website intro call request\nSubject: ${clean.subject}\n\n${clean.message}`}),signal:AbortSignal.timeout(15000),redirect:'error'});
    if(!response.ok)return {status:502,body:{error:'We couldn’t confirm receipt. Please try again, or contact our team directly.'}};
    return {status:200,body:{success:true}};
   }catch{return {status:502,body:{error:'We couldn’t confirm receipt. Please try again, or contact our team directly.'}};}
  })();
  submissions.set(key,{hash,result,until:now+600000});
  const outcome=await result;
  if(outcome.status!==200)submissions.delete(key);
  reply(res,outcome.status,outcome.body);
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)createEnquiryServer().listen(3001,'127.0.0.1');
