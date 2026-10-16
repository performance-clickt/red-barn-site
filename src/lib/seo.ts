import articleSources from '../../migration/seo/article-sources.json' with { type: 'json' };

export const SITE_ORIGIN = 'https://www.redbarninvestmentcounsel.ca';
export const EXCLUDED_PAGE_SLUGS = new Set(['home', 'about', 'cart', 'horizons', 'new-dropdown']);

export function canonicalPath(path: string): string {
  const pathname = path.split(/[?#]/)[0];
  return '/' + pathname.replace(/^\/+|\/+$/g, '');
}

export function canonicalUrl(path: string): string {
  return new URL(canonicalPath(path), SITE_ORIGIN).href;
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export interface Breadcrumb { name: string; path: string; }
export function breadcrumbSchema(items: Breadcrumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.name, item: canonicalUrl(item.path),
    })),
  };
}

interface SchemaSettings { phone: string; email: string; address: string; }
export interface ArticleMetadata { headline: string; date?: string | null; author?: string | null; }
interface SchemaOptions {
  path: string;
  title: string;
  description: string;
  settings: SchemaSettings;
  assetOrigin: string;
  image?: string | null;
  article?: ArticleMetadata;
  breadcrumbs?: Breadcrumb[];
}

/** Parse only the supported Canadian address format; preserve other CMS text verbatim. */
export function postalAddress(address: string) {
  const match = address.trim().match(/^(.+)\r?\n([^,]+),\s*([^,]+),\s*([A-Z]\d[A-Z]\s?\d[A-Z]\d)$/i);
  return match ? {
    '@type': 'PostalAddress', streetAddress: match[1].trim(), addressLocality: match[2].trim(),
    addressRegion: match[3].trim(), postalCode: match[4].toUpperCase(), addressCountry: 'CA',
  } : address;
}

export function schemaAssetUrl(image: string | null | undefined, origin: string): string | undefined {
  if (!image) return undefined;
  try {
    const url = new URL(image, origin);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

function schemaDate(value?: string | null): string | undefined {
  // The CMS stores publication dates without a time. Never invent a time or modification date.
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value ? value : undefined;
}

/** Recover recorded timestamps only while the CMS date and author still match the migrated article. */
export function articlePublicationDate(path: string, article: ArticleMetadata): string | undefined {
  const date = schemaDate(article.date);
  if (!date) return undefined;
  const source = articleSources.find(item => '/insights/' + item.source.replace(/^insights__|\.html$/g, '') === canonicalPath(path));
  if (source && source.author === article.author?.trim() && source.datePublished.slice(0, 10) === date) {
    return source.datePublished.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  }
  return date;
}

export function siteSchema({ path, title, description, settings, assetOrigin, image, article, breadcrumbs }: SchemaOptions) {
  const route = canonicalPath(path);
  const canonical = canonicalUrl(route);
  const home = canonicalUrl('/');
  const organizationId = home + '#organization';
  const websiteId = home + '#website';
  const pageId = canonical + '#webpage';
  const breadcrumbId = canonical + '#breadcrumb';
  const imageUrl = schemaAssetUrl(image, assetOrigin);
  const digits = settings.phone.replace(/\D/g, '');
  const phone = digits.length === 10 ? '+1' + digits : digits.length === 11 && digits.startsWith('1') ? '+' + digits : settings.phone;
  const pageType = ['/contact', '/start-here'].includes(route) ? 'ContactPage'
    : ['/our-story', '/our-team'].includes(route) ? 'AboutPage'
    : route === '/insights' ? 'CollectionPage' : 'WebPage';
  const trail = breadcrumbs || (route === '/' ? [] : [
    { name: 'Home', path: '/' },
    ...(article ? [{ name: 'Insights', path: '/insights' }] : []),
    { name: article?.headline || title.split(/\s[|—]\s/)[0], path: route },
  ]);
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'FinancialService', '@id': organizationId,
      name: 'Red Barn Investment Counsel', url: home, telephone: phone, email: settings.email,
      address: postalAddress(settings.address),
      image: schemaAssetUrl('/images/b27dc70ad2-RedBarn-Logo.webp', assetOrigin),
      logo: { '@type': 'ImageObject', '@id': home + '#logo',
        url: schemaAssetUrl('/images/b27dc70ad2-RedBarn-Logo.webp', assetOrigin), width: 680, height: 445 },
      parentOrganization: { '@type': 'Organization', name: 'Vesta Wealth Partners' },
    },
    {
      '@type': 'WebSite', '@id': websiteId, url: home, name: 'Red Barn Investment Counsel',
      alternateName: 'Red Barn', inLanguage: 'en-CA', publisher: { '@id': organizationId },
    },
    {
      '@type': pageType, '@id': pageId, url: canonical, name: title, description, inLanguage: 'en-CA',
      isPartOf: { '@id': websiteId }, about: { '@id': organizationId },
      ...(trail.length > 1 ? { breadcrumb: { '@id': breadcrumbId } } : {}),
      ...(imageUrl ? { primaryImageOfPage: { '@type': 'ImageObject', url: imageUrl } } : {}),
      ...(article ? { mainEntity: { '@id': canonical + '#article' } } : {}),
    },
  ];
  if (trail.length > 1) graph.push({ ...breadcrumbSchema(trail), '@id': breadcrumbId });
  if (article) {
    const date = articlePublicationDate(route, article);
    const author = article.author?.trim();
    graph.push({
      '@type': 'BlogPosting', '@id': canonical + '#article', headline: article.headline, description,
      url: canonical, mainEntityOfPage: { '@id': pageId }, isPartOf: { '@id': websiteId }, inLanguage: 'en-CA',
      ...(date ? { datePublished: date } : {}),
      author: !author || author === 'Red Barn Investment Counsel'
        ? { '@id': organizationId } : { '@type': 'Person', name: author,
          ...(author === 'Greg Flower' ? { url: canonicalUrl('/our-team') + '#greg-flower' } : {}) },
      publisher: { '@id': organizationId }, ...(imageUrl ? { image: imageUrl } : {}),
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
