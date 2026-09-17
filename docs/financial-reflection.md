# Financial Values Reflection

## Implemented locally

The dedicated static Astro route `/financial-reflection/` mounts `FinancialReflection.tsx` using the site's fonts, colours, buttons and layout. The catch-all excludes this one route. `/financial-quiz/` and its separate Financial Freedom Roadmap destination remain unchanged. The legacy `settings.quizUrl` field is no longer used by the reflection route; it remains in the settings schema for compatibility.

The quiz includes the intro, optional name, twelve sequential questions, native radio selection, explicit Next, Back with preserved/ editable answers, position-based progress, six results, four theme scores, overall average, reflection questions, family agenda, next steps, PDF download and restart. Focus moves to the new heading after navigation. Restart clears the name, answers and export feedback; refresh also clears state. No local storage, cookies, database writes or quiz submission requests are used.

Email is deferred by the user's explicit choice on 2026-09-17. The captured email label and results action are retained but disabled with an explanation. Unlike the observed app, an email address is not required or collected. No claim of email delivery is made. The homepage's quiz email/subscription claims and the content page's storage claim were revised to match this local-only release; exact quiz question and result copy is unchanged.

## Evidence levels

- **Observed:** Exact content and nineteen captured inputs/results in `financial-values-handoff.zip` (2026-09-17). `src/lib/reflection/content.json` and `tests/reflection/observed-test-cases.json` are byte-identical copies. Tests pin their SHA-256 hashes.
- **Reconstructed:** `calculateReflection` calculates arithmetic means, ranks unrounded scores, explicitly breaks ties Stewardship → Connection → Growth → Faith, maps the unordered top pair, and retains the archetype's canonical badge order. Displays use one decimal. All nineteen observed cases match this implementation. This is not original Lovable source or exhaustive proof of the historical algorithm.
- **New implementation choices:** Native radio cards; preservation/editing when using Back; heading focus; local-only state; deferred email; responsive design; PDF layout and export failure feedback. These are implemented and tested choices, not claims of source parity.
- **Unknown:** Original email provider/template, original PDF layout, submission schema, backend access controls, sheet destination, unsubscribe system and marketing consent storage. No original template fidelity is claimed.

## PDF

`src/lib/reflection/pdf.ts` receives the same calculated result displayed onscreen. It creates a paginated A4 export with all captured result text, theme/overall scores, agenda and next steps. PDF code is loaded only on demand. Work Sans is embedded from the local, licensed WOFF file under `public/fonts/`. PDF generation never sends answers to a server. Download failure leaves the result available and permits retry. The layout is newly designed, not a recreation of an unseen original artifact.

## Deployment and future delivery

Current architecture was inspected before implementation: `astro.config.mjs` builds static output. `Dockerfile` uses Nginx plus a Supervisor-managed Node service (`server/enquiries.mjs`, loopback port 3001). Nginx proxies only `/api/enquiries`; that service forwards intro-call requests to EspoCRM using runtime `ESPO_LEAD_CAPTURE_URL` and `FORM_ALLOWED_ORIGINS`. It is not an email service or a quiz storage API. Docker, Nginx, the enquiry service and Coolify settings are unchanged by this quiz work.

This release requires no new provider credentials or backend configuration. No code calls Lovable's Supabase endpoints, Google Sheets, or any results-email service. The Lovable URL in the content's provenance is historical metadata, not a runtime destination. `/financial-quiz` intentionally continues to link to its separate external app.

Before enabling transactional results email, choose a provider and provision a verified sender/domain plus server-side credentials (SMTP host/port/TLS/user/password or a chosen provider API key). Add a dedicated same-origin endpoint to the running Node service or a separately deployed service, and add the corresponding Nginx route. Do not add a static Astro API route and assume it runs in production. Validate answers server-side with the shared scorer, rate-limit and deduplicate requests, obtain explicit result-delivery intent, return success only on provider acceptance, and verify inbox receipt with an approved test address. Marketing requires a separate consent/unsubscribe design; it must not be implied by quiz completion.

CRM storage is also deferred. It needs a chosen entity/field mapping, retention/access policy and separate opt-in decision before sending names, answers or results into EspoCRM. Do not reuse the intro-call endpoint to silently store quiz responses. There is no Google Sheets requirement in this release.

## Validation (2026-09-17)

- `npm run test:reflection`: 19 observed cases against the new scorer; validation/edit/tie tests; original-content and fixture hashes; PDF export/load checks for all six archetypes.
- Build/check and the 36-route content audit pass. The audit has narrowly scoped substitutions for the intentionally retired quiz email promises and replacement intro.
- Extracted text from all six generated PDFs verified against all archetype copy, result labels, agenda and next steps (whitespace normalized). Both pages of the Guardian export visually reviewed.
- Browser: completed all twelve mixed-answer questions (fixture 19) and confirmed The Guide, canonical Connection/Growth order, 2.7/3.3/4.0/1.3 and overall 2.8. Tested keyboard Tab, Space, arrow keys, Enter, disabled Next before selection, Back preservation and editing, heading focus, optional blank name, restart clearing, and browser PDF action feedback. A second blank-name browser run with all Neutral answers confirmed The Guardian and 3.0/5.
- Responsive preview at 320, 390, 768, 1024 and 1440 pixels. No horizontal overflow observed; mobile uses stacked answer rows and agenda entries, tablet scores use two columns.
- No live email, CRM submission or sheet-sync test was performed for the quiz, because those integrations are deliberately absent.

All changes are local and unstaged. No commit, push or deployment was performed for this quiz task.
