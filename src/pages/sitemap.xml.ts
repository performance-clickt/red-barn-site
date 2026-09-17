import { reader } from '../lib/content';
import { canonicalUrl, EXCLUDED_PAGE_SLUGS } from '../lib/seo';
export async function GET() {
 const pages=await reader.collections.pages.list();const posts=await reader.collections.posts.list();
 const routes=[...new Set(['','insights',...pages.filter(slug=>!EXCLUDED_PAGE_SLUGS.has(slug)),...posts.map(slug=>`insights/${slug}`)])];
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(route=>`<url><loc>${canonicalUrl(route)}</loc></url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml'}});
}
