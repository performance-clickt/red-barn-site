import fs from 'node:fs/promises';
import { load } from 'cheerio';
const origin = process.argv[2];
if (!origin) throw new Error('Usage: node scripts/audit-schema.mjs https://site.example');
const before = process.env.SCHEMA_BASELINE ? JSON.parse(await fs.readFile(process.env.SCHEMA_BASELINE, 'utf8')) : [];
const xml = await (await fetch(origin + '/sitemap.xml')).text();
const sitemap = load(xml, { xml: true });
const routes = sitemap('loc').map((_, el) => new URL(sitemap(el).text()).pathname).get();
const errors = [], warnings = [], pages = [], assets = new Map();
const expect = (ok, route, message) => { if (!ok) errors.push({ route, message }); };
for (const route of routes) {
  const res = await fetch(origin + route);
  expect(res.status === 200, route, `HTTP ${res.status}`);
  const html = await res.text(), $ = load(html);
  const blocks = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try { blocks.push(JSON.parse($(el).text())); } catch { errors.push({ route, message: 'Invalid JSON-LD JSON' }); }
  });
  expect(blocks.length === 1, route, 'Expected one connected JSON-LD graph');
  expect(blocks.every(s => s['@context'] === 'https://schema.org'), route, 'Missing Schema.org context');
  const graph = blocks.flatMap(s => s['@graph'] || [s]);
  const get = type => graph.find(s => s['@type'] === type);
  const ids = new Map(graph.filter(s => s['@id']).map(s => [s['@id'], s]));
  expect(ids.size === graph.length, route, 'Missing or duplicate entity IDs');
  const canonical = $('link[rel="canonical"]').attr('href');
  const org = get('FinancialService'), site = get('WebSite');
  const pageType = ['/contact', '/start-here'].includes(route) ? 'ContactPage'
    : ['/our-story', '/our-team'].includes(route) ? 'AboutPage' : route === '/insights' ? 'CollectionPage' : 'WebPage';
  const page = get(pageType), breadcrumb = get('BreadcrumbList'), article = get('BlogPosting');
  expect(Boolean(org?.name && org?.telephone && org?.email), route, 'Business contact details missing');
  expect(org?.address?.['@type'] === 'PostalAddress' && org.address.addressCountry === 'CA', route, 'Current office address not structured');
  expect(Boolean(org?.logo?.url && org.logo.width >= 112 && org.logo.height >= 112), route, 'Organization logo missing or too small');
  expect(site?.name === 'Red Barn Investment Counsel' && site?.url?.endsWith('/'), route, 'Website identity missing');
  expect(page?.url === canonical && page?.name === $('title').text(), route, 'Page does not match canonical/title');
  expect(page?.isPartOf?.['@id'] === site?.['@id'], route, 'Page not linked to website');
  if (route !== '/') {
    expect(breadcrumb?.itemListElement?.length >= 2, route, 'Breadcrumb trail missing');
    expect(page?.breadcrumb?.['@id'] === breadcrumb?.['@id'], route, 'Page not linked to breadcrumbs');
    breadcrumb?.itemListElement?.forEach((item, i) => {
      expect(item['@type'] === 'ListItem' && item.position === i + 1 && item.name?.trim(), route, 'Invalid breadcrumb item');
    });
    expect(breadcrumb?.itemListElement?.at(-1)?.item === canonical, route, 'Last breadcrumb is not this page');
  }
  if (route.startsWith('/insights/')) {
    expect(article?.headline === $('h1').text(), route, 'Article headline differs from visible heading');
    expect(article?.author?.name === $('.article-byline>span').first().text().replace(/^By /, ''), route, 'Article author differs from visible author');
    expect(article?.datePublished?.slice(0, 10) === $('.article-byline time').attr('datetime'), route, 'Article date differs from visible date');
    expect(article?.mainEntityOfPage?.['@id'] === page?.['@id'] && page?.mainEntity?.['@id'] === article?.['@id'], route, 'Article/page relationship missing');
    expect(article?.publisher?.['@id'] === org?.['@id'], route, 'Article publisher unresolved');
    if (!article?.image) {
      expect($('.article-prose img').length === 0, route, 'Article has visible imagery but no image metadata');
      warnings.push({ route, message: 'Text-only article: no representative image; image property intentionally omitted.' });
    }
  }
  function walk(value, key) {
    if (Array.isArray(value)) return value.forEach(v => walk(v, key));
    if (value && typeof value === 'object') {
      if (Object.keys(value).length === 1 && value['@id']) expect(ids.has(value['@id']), route, 'Unresolved reference: ' + value['@id']);
      if (value['@type'] === 'ImageObject' && value.url) assets.set(value.url, route);
      for (const [k, v] of Object.entries(value)) walk(v, k);
    } else if (typeof value === 'string') {
      if (['@id', 'url', 'item', 'image'].includes(key)) expect(/^https?:\/\//.test(value), route, 'Non-absolute URL: ' + value);
      if (key === 'image') assets.set(value, route);
    }
  }
  graph.forEach(s => walk(s));
  const old = before.find(p => p.path === route);
  if (old) {
    const previous = load(old.html);
    // Astro regenerates hydration island UIDs when server modules change; these are not rendered content.
    $('astro-island').removeAttr('uid');previous('astro-island').removeAttr('uid');
    // A biography fragment identifier has no rendered effect.
    if(route === '/our-team') $('#greg-flower').removeAttr('id');
    expect($('body').html() === previous('body').html(), route, 'Visible body HTML changed');
    $('script[type="application/ld+json"]').remove();previous('script[type="application/ld+json"]').remove();
    expect($('head').html().replace(/>\s+</g, '><').trim() === previous('head').html().replace(/>\s+</g, '><').trim(), route, 'Non-schema head markup changed');
  }
  pages.push({ route, types: graph.map(s => s['@type']), schemas: blocks, comparedBody: Boolean(old) });
}
for (const [url, route] of assets) {
  const response = await fetch(url, { method: 'HEAD' });
  expect(response.ok && response.headers.get('content-type')?.startsWith('image/'), route, 'Schema image unavailable: ' + url);
}
const missing = await fetch(origin + '/schema-check-missing-page');
expect(missing.status === 404, '/schema-check-missing-page', 'Missing page must return 404');
expect(!/application\/ld\+json/.test(await missing.text()), '/schema-check-missing-page', 'Error page must not describe an indexable content entity');
const report = { origin, pagesChecked: pages.length, schemaImagesChecked: assets.size, errors, warnings, pages };
if (process.env.SCHEMA_REPORT) await fs.writeFile(process.env.SCHEMA_REPORT, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ pagesChecked: pages.length, schemaImagesChecked: assets.size, bodiesCompared: pages.filter(p => p.comparedBody).length, errors, warnings }, null, 2));
if (errors.length) process.exitCode = 1;
