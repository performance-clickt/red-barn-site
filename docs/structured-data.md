# Structured data

The server-rendered layout emits one JSON-LD graph per public page. FinancialService identifies the Red Barn operating division; WebSite and page nodes connect it to page-specific metadata. Contact, story/team and insights index pages use ContactPage, AboutPage and CollectionPage respectively. All non-home public pages receive an ordered breadcrumb trail. Insight pages include BlogPosting with the actual published author and date. Error pages omit content schema.

Business contact details come from published EmDash settings. The supported Canadian address format becomes PostalAddress; other address edits fall back to the supplied text rather than keeping stale location fields. Dates are not derived from the migration or deployment timestamp. Three current text-only articles have no image field because their visible pages have no representative image. Optional opening hours, prices, ratings, social profiles and author profile URLs are not fabricated.

Entity IDs and page URLs retain the existing production canonical origin. Binary image URLs use EMDASH_SITE_URL, which is the actual deployed asset origin; this avoids pointing staging markup at files that do not exist on the still-separate production website. Set that variable for both build and runtime when changing deployment domains. Staging remains noindex and disallow-all; markup validation is not a claim of Google indexing or rich-result eligibility.

## Checks

- `npm run test:schema`: context, references, page typing, dates, fallback behavior and safe serialization. Runs in the Docker build.
- `npm run audit:schema -- https://redbarn-preview.91.98.31.168.sslip.io`: checks every sitemap page, linked entities, article bylines/dates, breadcrumbs, image availability and 404 behavior.
- Set `SCHEMA_REPORT=/path/report.json` to save a report.
- Set `SCHEMA_BASELINE=/path/before.json` to compare body and non-schema head markup against a captured array of `{path,html}`. Generated Astro island UIDs and the nonvisual Greg biography fragment ID are excluded from this comparison.
- Pixel comparisons use the saved pre-change screenshots through `scripts/emdash/compare-staging.mjs`.

## References

- https://developers.google.com/search/docs/appearance/structured-data/organization
- https://developers.google.com/search/docs/appearance/structured-data/article
- https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
- https://developers.google.com/search/docs/appearance/site-names
- https://schema.org/FinancialService
- https://validator.schema.org/

## Google Rich Results follow-up (2026-10-16)

Google URL mode correctly reports staging as blocked by robots.txt; test exact rendered HTML in Code mode without changing staging indexability.

Google flagged date-only values as optional invalid/missing-timezone warnings. The migration archive (`migration/seo/article-sources.json`) contains the original publication timestamps. `articlePublicationDate` restores those recorded times and normalizes the offset to ISO 8601 only when the route, CMS date, and author still match; edited/new articles retain their supplied date without inventing a time. Original modification timestamps are not reused because they do not describe later CMS edits.

The FinancialService image uses Red Barn's existing logo. Greg Flower's author URL points to his existing team biography, with a nonvisual fragment identifier. Quincy Harriman has no verified author-profile association in the migrated site, so his optional URL remains unset. No pricing is published, so priceRange remains unset. Text-only articles retain no image.
