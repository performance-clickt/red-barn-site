import { test } from 'node:test';
import assert from 'node:assert/strict';
import { siteSchema, breadcrumbSchema, serializeJsonLd, postalAddress, schemaAssetUrl, articlePublicationDate } from '../../src/lib/seo.ts';
const settings={phone:'(587) 612-5511',email:'info@redbarninvestmentcounsel.ca',address:'103, 1025 - 10 st SE\nCalgary, Alberta, T2G 3E1'};
const options={path:'/',title:'Red Barn Investment Counsel',description:'Investing for generations.',settings,assetOrigin:'https://staging.example.test'};
const node=(schema,type)=>schema['@graph'].find(x=>x['@type']===type);
test('homepage identifies the business and website with a reachable deployment-origin logo',()=>{
 const s=siteSchema(options),o=node(s,'FinancialService');
 assert.equal(s['@context'],'https://schema.org');assert.equal(o.telephone,'+15876125511');
 assert.equal(o.address.addressCountry,'CA');assert.equal(o.address.addressLocality,'Calgary');
 assert.equal(o.logo.url,'https://staging.example.test/images/b27dc70ad2-RedBarn-Logo.webp');
 assert.equal(node(s,'WebSite').publisher['@id'],o['@id']);assert.equal(node(s,'BreadcrumbList'),undefined);
});
test('standalone breadcrumbs carry their own context and ordered canonical URLs',()=>{
 const b=breadcrumbSchema([{name:'Home',path:'/'},{name:'Contact',path:'/contact/?ref=a'}]);
 assert.equal(b['@context'],'https://schema.org');assert.equal(b.itemListElement[1].position,2);
 assert.equal(b.itemListElement[1].item,'https://www.redbarninvestmentcounsel.ca/contact');
});
test('page types and breadcrumbs reflect actual page purpose',()=>{
 for(const [path,type] of [['/contact','ContactPage'],['/start-here','ContactPage'],['/our-team','AboutPage'],['/our-story','AboutPage'],['/insights','CollectionPage'],['/financial-reflection','WebPage']]){
  const s=siteSchema({...options,path});assert.ok(node(s,type));assert.equal(node(s,'BreadcrumbList').itemListElement.length,2);
 }
});
test('articles connect publisher, website, page and breadcrumb without inventing dates',()=>{
 const s=siteSchema({...options,path:'/insights/example',image:'/_emdash/api/media/file/photo.webp',article:{headline:'A real story',date:'2026-09-11',author:'Greg Flower'}});
 const a=node(s,'BlogPosting'),p=node(s,'WebPage');assert.equal(a.author.name,'Greg Flower');assert.equal(a.datePublished,'2026-09-11');
 assert.equal(a.dateModified,undefined);assert.equal(a.mainEntityOfPage['@id'],p['@id']);assert.equal(p.mainEntity['@id'],a['@id']);
 assert.equal(a.image,'https://staging.example.test/_emdash/api/media/file/photo.webp');
 assert.deepEqual(node(s,'BreadcrumbList').itemListElement.map(x=>x.name),['Home','Insights','A real story']);
});
test('missing author matches the visible organization fallback; missing images stay unset',()=>{
 const a=node(siteSchema({...options,path:'/insights/no-image',article:{headline:'Text only'}}),'BlogPosting');
 assert.equal(a.author['@id'],'https://www.redbarninvestmentcounsel.ca/#organization');assert.equal(a.image,undefined);
});
test('invalid dates are omitted rather than normalized into fictional publication dates',()=>{
 for(const date of ['2026-02-30','yesterday','2026-13-01'])assert.equal(node(siteSchema({...options,article:{headline:'Story',date}}),'BlogPosting').datePublished,undefined);
});
test('address edits never retain stale locality values and unsafe assets are omitted',()=>{
 assert.equal(postalAddress('New office address'),'New office address');
 assert.equal(schemaAssetUrl('javascript:alert(1)',options.assetOrigin),undefined);assert.equal(schemaAssetUrl('data:image/svg+xml,x',options.assetOrigin),undefined);
 assert.equal(schemaAssetUrl('https://cdn.example.test/photo.jpg',options.assetOrigin),'https://cdn.example.test/photo.jpg');
});
test('CMS text cannot terminate the JSON-LD script element',()=>{
 const json=serializeJsonLd(siteSchema({...options,title:'</script><script>alert(1)</script>\u2028'}));
 assert.ok(!json.includes('<'));assert.ok(!json.includes('\u2028'));assert.ok(JSON.parse(json));
});

test('migrated publication timestamps retain recorded time zones without overriding CMS edits',()=>{
 assert.equal(articlePublicationDate('/insights/canadian-productivity',{headline:'Story',date:'2026-09-11',author:'Greg Flower'}),'2026-09-11T08:52:36-06:00');
 assert.equal(articlePublicationDate('/insights/canadian-productivity',{headline:'Story',date:'2026-09-12',author:'Greg Flower'}),'2026-09-12');
 assert.equal(articlePublicationDate('/insights/canadian-productivity',{headline:'Story',date:'2026-09-11',author:'New Author'}),'2026-09-11');
 assert.equal(articlePublicationDate('/insights/new',{headline:'Story',date:'2026-09-11',author:'Greg Flower'}),'2026-09-11');
 const s=siteSchema({...options,path:'/insights/canadian-productivity',article:{headline:'Story',date:'2026-09-11',author:'Greg Flower'}});
 assert.equal(node(s,'BlogPosting').author.url,'https://www.redbarninvestmentcounsel.ca/our-team#greg-flower');
 assert.equal(node(s,'FinancialService').image,node(s,'FinancialService').logo.url);
 const other=siteSchema({...options,article:{headline:'Story',author:'Quincy Harriman'}});
 assert.equal(node(other,'BlogPosting').author.url,undefined);
});
