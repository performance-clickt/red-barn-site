# Image delivery and performance

`npm run build` now prepares responsive images, builds Astro, then adds responsive sources to static HTML. Original CMS files remain intact. No new packages are required: Sharp and Cheerio were already build dependencies.

- `scripts/performance/prepare-images.mjs` creates WebP widths up to 1920px without enlargement. Filenames hash both source bytes and encoding settings. Logo encoding uses a higher quality setting.
- Derived files and the build manifest live in ignored `public/optimized/`. They are regenerated on a clean build; the manifest itself is removed from the published output.
- `scripts/performance/optimize-html.mjs` adds `srcset`/`sizes` to static images and reserves source dimensions when absent. Lazy images use native automatic sizing with a conservative fallback. Original full-size article links remain untouched.
- React island markup is not post-processed. `src/lib/responsive-images.ts` supplies selected image attributes as server props for the homepage gallery and reflection quiz, preserving hydration consistency. Without a manifest during development, originals remain the fallback.
- The two gallery cells hidden below 641px use a tiny inline source at that breakpoint. Desktop sources remain available immediately on resize. The visible hero image remains eager/high-priority. Motion, crops, layout and content are unchanged.
- The existing philosophy video poster is now a locally compressed 960px WebP. The video stream and playback behavior are unchanged.
- Nginx gives content-hashed `/_astro/` and `/optimized/` assets a one-year cache lifetime; reusable `/images/` and `/fonts/` paths get one day with normal validators. HTML is not given a long cache lifetime. Review-site noindex and security headers remain inherited.

## Validation — 17 September 2026

Two isolated Nginx containers served the pre-change local build and optimized build. Lighthouse 13.4.0 used default simulated mobile throttling, sequentially, with the desktop preset for the desktop homepage. This controls the compression/server difference that made the earlier Python quiz preview unsuitable for production comparisons. These are local lab comparisons, not post-deployment or field measurements.

| Page | Before score | After score | Before / after transfer |
|---|---:|---:|---:|
| Homepage, mobile | 76 | 91–93 | 1,056 / 420 KiB |
| Our Story, mobile | 85 | 97–98 | 695 / 327 KiB |
| Start Here, mobile | 97 | 97 | 291 / 237 KiB |
| Growing, mobile | 92 | 98 | 430 / 227 KiB |
| Canadian Productivity, mobile | 99 | 99 | 155 / 136 KiB |
| Reflection, mobile | 95 | 98–100 | 298 / 230 KiB |
| Homepage, desktop | 98 | 100 | 1,056 / 462 KiB |

Final mobile homepage LCP was 3.5s (earlier optimized run 3.2s), versus 6.2s in the paired baseline. Final Our Story LCP was 2.6s versus 4.3s. Mobile LCP still has room to improve; the score alone does not mean all Web Vitals are green. An intermediate article run had 270ms blocking time; the final rerun had 0ms and recovered to 99. All initial and final reports are retained outside the repository in `../performance-audit-2026-09-17/optimization/`.

Build and 36-page content/link audit passed; all 28 reflection tests passed. Nginx syntax and real cache/security headers checked. Responsive sources checked for missing files. Browser checks covered 390px, 768px and 1440px, mobile gallery source selection, scroll reveal, desktop gallery/photo quality, article chart aspect ratio, and quiz hydration. No overflow or browser errors were observed in those checks.

No additional CSS/JS refactor was needed: measured blocking time was zero on the final runs. Existing unrelated quiz edits were retained. These changes are local and require a deployment before the public review site benefits.
