# Red Barn — Astro + EmDash

EmDash 1.3.0 powers the existing Astro frontend. The migration preserves the Graham-approved staging design, URLs, content, assets and interactions from `main` commit `b18805f`.

- Staging: https://redbarn-preview.91.98.31.168.sslip.io/
- Previous EmDash preview redirects to staging.
- Deployment branch: `main`
- Repository: https://github.com/performance-clickt/red-barn-site

## Run

Use Node 22.12 or newer.

```sh
npm ci
npm run cms:import
npm run dev
```

Website: http://127.0.0.1:4321. Editor: http://127.0.0.1:4321/_emdash/admin.

The importer initializes an empty database, imports 35 published records and the media library, then marks the import complete. Subsequent runs preserve editor changes. It refuses a database with unrelated existing collections. `src/content/` and `migration/keystatic.config.ts` are retained migration inputs; public pages read only published EmDash content.

```sh
npm run build
PORT=4322 node server/start-cms.mjs
AUDIT_BASE_URL=http://127.0.0.1:4322 npm run audit:content
npm run test:cms
npm run test:reflection
node --test server/enquiries.test.mjs
```

## Editing and publishing

The hosted editor has five collections:

- Homepage: hero, gallery, section copy, benefits and onboarding steps; edit the `main` entry.
- Website pages: 20 existing pages, SEO fields, hero image and rich text.
- Insights: 12 articles, dates, authors, SEO fields and rich text.
- Contact & site settings: shared contact details, disclosures and quiz links; edit `main`.
- Insights index settings: listing title and introduction; edit `main`.

Save a draft to keep edits private; Publish makes them visible immediately without a rebuild. Preserve existing slugs, and add explicit redirects before changing them. Imported complex layouts such as team biographies use editable HTML blocks within rich text to retain their exact structure. HTML blocks are sanitized before rendering. Existing hero and rich-text images are registered in EmDash's media library; new uploads live in persistent storage.

The frontend templates, styles and React islands are unchanged. `src/lib/content.ts` maps EmDash fields to the existing template interface. `src/lib/cms-rich-text.mjs` preserves the original rich-text HTML. Responsive image markup is applied to server-rendered responses. The exact staging optimized image bytes are retained in `seed/optimized-baseline.tar.gz` (SHA-256 verified at build time), because fresh image encoding varies by platform. Newly changed image sources receive new derived filenames.

## Hero

`src/components/ui/hero-gallery-scroll-animation.tsx` adapts the supplied React/Motion concept as one hydrated Astro island. On first load the photographs cover the hero. Scrolling moves the tiles outwards and reveals the contact form. Scroll back up to close the gallery again. The header’s Start Here link and the scroll cue skip to the open state.

The form cannot receive keyboard focus while covered. Mobile uses three visible photos and different exit directions. Reduced-motion users get a static gallery followed by the form, without a pinned scroll sequence. With JavaScript disabled, the page shows a static layout and an email link.

The shared UI directory is `src/components/ui`, exposed as `@/components/ui` via tsconfig. `components.json` supplies shadcn-compatible aliases. Tailwind v4 is installed through its Vite plugin; page styling lives in `src/styles/global.css`.

## Form delivery

The shared form posts to `/api/enquiries`, served by a small Node relay alongside Nginx. It submits names, email, subject and message to EspoCRM Lead Capture. The browser never receives the capture key and never opens an email draft as part of submission. Success appears only after the CRM accepts the request.

Configure these **runtime-only** variables in Coolify before deployment:

- `ESPO_LEAD_CAPTURE_URL`: the private HTTPS capture endpoint from EspoCRM Administration → Lead Capture. Never commit this value.
- `FORM_ALLOWED_ORIGINS`: comma-separated exact website origins (no trailing slash).

Capture payload fields: First Name, Last Name, Email and Description. Keep mailing-list subscription and double opt-in off for these enquiries. The subject and message are saved together in Description. No API administrator account is needed.

The relay validates fields and origin, limits payload size, includes a honeypot, and limits requests to 120 per minute overall and three per email address. Duplicate submissions with the same key are coalesced for ten minutes within a running process. These in-memory controls reset on restart; they are not a durable delivery queue. Failed submissions retain the visitor's form details. Run `node --test server/enquiries.test.mjs` to verify mapping, duplicate suppression, validation and failure handling. EmDash stores website content, not enquiries.

## External content

The self-hosted `/financial-reflection` quiz provides on-screen results and local PDF export. Email and CRM storage are deferred; see `docs/financial-reflection.md` for evidence, validation and future configuration. `/financial-quiz` remains a separate externally hosted Financial Freedom Roadmap app; its hosting and submission behavior remain with its existing provider. The existing Squarespace HLS philosophy video remains externally hosted and plays through native HLS or a lazily loaded HLS player. Move these services/media before retiring the old account if required. External editorial links and webinar registrations are retained.

## Deployment and persistence

Coolify: https://coolify.pyrito.com, project **Red Barn**, application **Red Barn EmDash Preview** (now serving staging) (`ghucaajw5nmvzze4uv3rd4hh`). Dockerfile build pack, branch `main`, container port 80, host port 18092. Use the container-command health check `node /app/server/healthcheck.mjs` (30-second interval, 5-second timeout, 3 retries, 90-second start period). Deploy manually after pushing main. The former static staging application is retained as **Red Barn Website** as the static rollback, pinned to `b18805fae9def3e76975a60f9f636f9636245777` on port 18091.

Required directory mount:

- Host: `/opt/redbarn-emdash/data`
- Container: `/app/data`

Run one application instance. This directory holds `emdash.db` (SQLite), uploaded media, sessions and `encryption.key`. The startup script generates the encryption key once with mode 0600. Preserve the key alongside the database on every backup/restore. The volume must be writable by UID 1000. Never copy a disposable development database or dev-bypass user to deployment.

Set `EMDASH_SITE_URL=https://redbarn-preview.91.98.31.168.sslip.io` for **both build and runtime**. It must match the public HTTPS origin used for passkeys. The internal server listens on 127.0.0.1:4321 behind Nginx; only Nginx port 80 is exposed. Caddy provides HTTPS and forwards the existing staging host to port 18092. The previous EmDash preview host redirects to staging so editor passkeys use one origin.

The entire editor and API are protected by an additional HTTP Basic gate using `/app/data/admin.htpasswd`; public media files remain readable. The access credentials are handed over privately. Complete first-user setup with your own email and passkey after passing this gate. Production builds disable EmDash's development bypass. The public site remains `noindex, nofollow` and has a disallow-all robots file.

The enquiry relay accepts runtime environment variables or the private optional file `/app/data/enquiries.env`. The original staging container had **no lead-capture configuration** at migration time; supply `ESPO_LEAD_CAPTURE_URL` and `FORM_ALLOWED_ORIGINS` before considering enquiry delivery enabled. The site health endpoint checks CMS content availability; relay readiness can be checked separately inside the container at `http://127.0.0.1:3001/healthz`. No real enquiries are sent by migration tests.

### Backup, deployment and rollback

Before updates after editing has begun, stop this staging application and back up the complete host data directory, then deploy one instance. Stopping avoids concurrent writers during migration and gives a consistent SQLite backup. Keep backups outside the application volume, with restricted permissions. Restore a backup and its matching application revision together if a schema migration needs rollback. Never overwrite the CMS volume with the source seed to roll back content.

A fresh deployment imports the seed only once. Restarts and redeployments preserve CMS edits and media. The original static staging app on port 18091 remains the fallback. To roll back public staging, restore its Caddy upstream to `172.18.0.1:18091` and validate/reload Caddy. This does not overwrite EmDash content. A pre-cutover database/media/key backup is retained at `/opt/redbarn-emdash/backups/pre-main-20261016T183251Z`. Redirects, PDF canonical headers and the external quiz/video providers are retained.

## Verification

- `npm run test:cms`: all 32 rich-text bodies match the original HTML structure, plus unsafe HTML rejection and native editor table rendering.
- `node scripts/emdash/test-publishing.mjs`: runs **only** against a disposable local development database on port 4323; verifies draft isolation, publish visibility, unauthorized-write rejection and media upload bytes. Do not use a deployment database.
- `node scripts/emdash/compare-staging.mjs`: 34 public routes at desktop 1440 px and mobile 390 px against staging; fails on any screenshot pixel difference.
- For a cutover on the same URL, first set `QA_CAPTURE_BASELINE=1 QA_BASELINE_DIR=/absolute/path/to/baseline` when running the visual comparison script; then compare the deployed candidate with `QA_BASELINE_DIR` set and `QA_CAPTURE_BASELINE` unset. Saved baselines preserve the before-deployment reference.
- `npm run audit:content`: rendered content, internal links and images against the running SSR server.

The migration source was originally downloaded from the existing Squarespace site on 2026-09-16. Original legal and investment claims are retained; no new investment-performance claims were introduced. The live production domain has not been moved.
