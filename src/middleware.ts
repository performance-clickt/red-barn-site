import { defineMiddleware } from 'astro:middleware';
import { optimizeHtml } from './lib/optimize-html.mjs';
export const onRequest=defineMiddleware(async(context,next)=>{
 const response=await next();
 if(context.url.pathname.startsWith('/_emdash') || !response.headers.get('content-type')?.includes('text/html'))return response;
 const headers=new Headers(response.headers);
 headers.delete('content-length');headers.delete('etag');
 headers.set('Cache-Control','no-store');
 headers.set('X-Robots-Tag','noindex, nofollow');
 return new Response(optimizeHtml(await response.text()),{status:response.status,statusText:response.statusText,headers});
});
