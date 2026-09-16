# Red Barn — Astro + Keystatic

A new visual design using Red Barn’s existing content, photography, logo, colors and fonts. Deployed as a public review site through Coolify; the live Squarespace website has not been changed.

- Preview: https://redbarn.178.104.248.103.sslip.io/
- Repository: https://github.com/performance-clickt/red-barn-site

## Run

Node 22.12+ is required. Dependencies are pinned in package.json and package-lock.json.

```sh
npm ci
npm run dev
```

- Website: http://127.0.0.1:4321
- Content editor: http://127.0.0.1:4321/keystatic
- Build: `npm run build`
- Preview the static build: `npm run preview`
- Verify migrated content and internal links after a build: `npm run audit:content`

## Editing

Keystatic uses local, file-backed storage. There is no paid CMS service or account dependency. The editor writes directly to this project:

- **Homepage:** hero headline, five gallery photos, introductory text, differences, family meeting content, investment approach, onboarding, quiz and advisor copy.
- **Website pages:** 21 pages, including services, seasons, team bios and policies, with Markdoc rich text and local images.
- **Insights:** all 12 published articles, including original publication dates, charts, links, disclosures and downloads.
- **Contact & site settings:** contact details, legal disclosures and quiz URLs.

The homepage, /home alias and insights index complete the 36 imported URLs (root plus the 35 URLs in the original sitemap). New collection entries receive routes automatically at build time. Keep existing slugs stable unless you also add a redirect. The original source URL is reference metadata, not rendered page copy.

Save in Keystatic, refresh the local page, then rebuild to publish changes. Local mode is intended for a trusted local computer. The editor is deliberately excluded from production builds. A hosted editor would need a separate GitHub-backed/authenticated setup; none has been enabled.

## Hero

`src/components/ui/hero-gallery-scroll-animation.tsx` adapts the supplied React/Motion concept as one hydrated Astro island. On first load the photographs cover the hero. Scrolling moves the tiles outwards and reveals the contact form. Scroll back up to close the gallery again. The header’s Start Here link and the scroll cue skip to the open state.

The form cannot receive keyboard focus while covered. Mobile uses three visible photos and different exit directions. Reduced-motion users get a static gallery followed by the form, without a pinned scroll sequence. With JavaScript disabled, the page shows a static layout and an email link.

The shared UI directory is `src/components/ui`, exposed as `@/components/ui` via tsconfig. `components.json` supplies shadcn-compatible aliases. Tailwind v4 is installed through its Vite plugin; page styling lives in `src/styles/global.css`.

## Form delivery

The form is functional as an **email-draft composer**. It validates the original contact details (first/last name, email, subject and message), then presents a mailto link to the configured Red Barn inbox. It never claims an inquiry has been sent. No inquiry data is saved, tracked or transmitted by the site itself.

Direct website-to-inbox delivery is not configured. Before using direct submissions in production, connect a server-side mail/form endpoint, add appropriate spam protection, and test actual receipt. Keystatic stores website content; it is not an inquiry database. The old Squarespace submission integration was not copied.

## External content

The original financial-values tools are linked from `/financial-reflection` and `/financial-quiz` with a clear launch button (the embedded view stayed blank during local browser testing). Their hosting and submission behavior remain with their existing provider. The existing Squarespace HLS philosophy video remains externally hosted and plays through native HLS or a lazily loaded HLS player. Move these services/media before retiring the old account if required. External editorial links and webinar registrations are retained.

## Source & migration

Content was downloaded from https://www.redbarninvestmentcounsel.ca/ on 2026-09-16. Source manifests and the migration audit live under `migration/`. Original Squarespace layout, CSS and scripts do not ship in the rebuilt pages. Empty decorative spacer images were discarded. A pre-existing `/horizons` link in About now points to `/seasons`.

The design retains the live site’s Work Sans, Droid Sans and Space Grotesk, with `#B01F29` red, `#342E2E` charcoal, `#FAFAFA` white and `#E8E8E8` gray. Fonts and editorial images are served locally. CMS-managed images are isolated under `public/images/homepage`, `public/images/pages/<slug>` and `public/images/posts/<slug>` so edits cannot remove another page’s photographs. Existing co-branded Red Barn / Vesta artwork is preserved.

`fetch-source.py`, `migrate-content.mjs`, `fetch-assets.py`, `optimize-assets.mjs` and `namespace-content-assets.mjs` document the one-time import. Do not rerun migration over edited CMS content: it overwrites imported entries. The retained content inventory supports comparison without recrawling the live site.

## Deployment

`npm run build` produces `dist/` for any static host. The included Dockerfile builds and audits the site, then serves only the static output with Nginx. In Coolify, use the Dockerfile build pack, branch `main`, and container port `80`. Health checks use `/healthz`. No application secrets, database, or persistent volume are needed.

The Coolify application is in the **Red Barn** project on `dev.pyrito.com`, connected to this public repository. To publish an update, commit and push to `main`, then choose **Actions → Deploy** in Coolify. Automatic push webhooks are not configured. Keystatic stays available through local development; the public deployment serves the saved content only.

The container is configured as a public review deployment: it sends `X-Robots-Tag: noindex, nofollow` and a disallow-all robots file. Remove those review-only rules from `deploy/nginx.conf` when intentionally launching the replacement production site. The existing live domain remains unchanged. Production omits `/keystatic` and `/api/keystatic`; existing public routes, canonical URLs, metadata, sitemap and robots file are included. The /home alias canonicalizes to the root.

The original legal and investment claims have been migrated, not independently re-approved. No new investment-performance claims were introduced.
