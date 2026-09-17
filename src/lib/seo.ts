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
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.name, item: canonicalUrl(item.path),
    })),
  };
}
