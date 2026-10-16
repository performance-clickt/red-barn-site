# Structured data

The server-rendered layout emits one JSON-LD graph per public page. FinancialService identifies the Red Barn operating division; WebSite and page nodes connect it to page-specific metadata. Contact, story/team and insights index pages use ContactPage, AboutPage and CollectionPage respectively. All non-home public pages receive an ordered breadcrumb trail. Insight pages include BlogPosting with the actual published author and date. Error pages omit content schema.

Business contact details come from published EmDash settings. The supported Canadian address format becomes PostalAddress; other address edits fall back to the supplied text rather than keeping stale location fields. Dates are not derived from the migration or deployment timestamp. Three current text-only articles have no image field because their visible pages have no representative image. Optional opening hours, prices, ratings, social profiles and author profile URLs are not fabricated.

Entity IDs and page URLs retain the existing production canonical origin. Binary image URLs use EMDASH_SITE_URL, which is the actual deployed asset origin; this avoids pointing staging markup at files that do not exist on the still-separate production website. Set that variable for both build and runtime when changing deployment domains. Staging remains noindex and disallow-all; markup validation is not a claim of Google indexing or rich-result eligibility.

## Checks

- `npm run test:schema`: context, references, page typing, dates, fallback behavior and safe serialization. Runs in the Docker build.
- `npm run audit:schema -- https://redbarn-preview.91.98.31.168.sslip.io`: checks every sitemap page, linked entities, article bylines/dates, breadcrumbs, image availability and 404 behavior.
- Set `SCHEMA_REPORT=/path/report.json` to save a report.
- Set `SCHEMA_BASELINE=/path/before.json` to compare body and non-schema head markup against a captured array of `{path,html}`. Generated Astro island UIDs are excluded from this comparison.
- Pixel comparisons use the saved pre-change screenshots through `scripts/emdash/compare-staging.mjs`.

## References

- https://developers.google.com/search/docs/appearance/structured-data/organization
- https://developers.google.com/search/docs/appearance/structured-data/article
- https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
- https://developers.google.com/search/docs/appearance/site-names
- https://schema.org/FinancialService
- https://validator.schema.org/
