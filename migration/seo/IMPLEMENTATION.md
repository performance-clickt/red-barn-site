# Approved SEO implementation — development release

Implemented from the 17 September 2026 approval document. `approved-metadata.json` is the exact 34-page acceptance register. `resources.json` maps the 20 preserved original downloads; all are byte-identical aliases, not reconstructed documents.

## Editing and delivery
Keystatic SEO title and main heading are separate from the existing slug-linked title. Homepage and Insights have dedicated metadata fields. Nginx serves slashless routes and real 301 redirects; Astro preview redirects are not deployment evidence. PDF aliases and hashed originals share a canonical HTTP Link header. Organization, article and visible breadcrumb structured data use the primary canonical domain.

Original article dates and authors were compared with captured JSON-LD (`article-sources.json`). Two migration bylines were corrected to Quincy Harriman. Reflection scoring, questions, result copy, PDF and delivery integrations were not changed.

## Validation
Run `npm run build`, `npm run audit:content`, `npm run test:reflection`, `node scripts/audit-seo.mjs`. For HTTP assertions run `node scripts/audit-seo.mjs https://redbarn.178.104.248.103.sslip.io` (or a local Nginx origin). The HTTP audit checks exact metadata, one H1, canonicals, sitemap, redirects, 404/410, noindex, robots, downloads by SHA-256 and PDF canonical headers.

Responsive browser checks covered Our Story, Sowing, the long oil article headline and Financial Values Reflection at 360, 390, 768, 1024 and 1440 pixels. No horizontal document overflow. Keyboard entry and answer navigation were spot-checked. Existing automated reflection suite includes all 19 observed scoring fixtures.

## Deferred work and production gate
`legacy-recovery.json` records 19 previously broken historical URLs. Original content/backups and editorial review remain necessary; no invented replacements or broad redirects were installed. Search Console and GA4 baselines remain unavailable until connected.

This is a review deployment. Keep the Nginx X-Robots-Tag and robots Disallow rules active. Production cutover requires separate authorization: recover or explicitly decide each historical URL, confirm primary hostname/TLS and apex/www redirects, remove review noindex and replace robots with crawlable sitemap declaration only on production, recrawl all routes/resources, then submit the sitemap in Search Console. Do not make the review domain indexable. DNS and the existing primary site are unchanged.
