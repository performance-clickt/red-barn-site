import type { APIRoute } from 'astro';
import { getEmDashEntry } from 'emdash';
export const GET:APIRoute=async()=>{
 try {
  const {entry,error}=await getEmDashEntry('settings','main');
  return new Response(entry&&!error?'ok\n':'CMS unavailable\n',{status:entry&&!error?200:503,headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}});
 } catch {return new Response('CMS unavailable\n',{status:503});}
};
