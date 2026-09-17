import fs from 'node:fs';
interface ImageEntry { variants: { width: number; src: string }[]; width: number; height: number; }
// Server-only helper: pass only the required image attributes to React islands.
export function responsiveImage(src: string | null | undefined, sizes: string) {
  if (!src) return {};
  // Use the project root for bundled SSR output as well as the source module.
  const manifestPath = `${process.cwd()}/public/optimized/manifest.json`;
  if (!fs.existsSync(manifestPath)) return { src };
  const entry = (JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<string, ImageEntry>)[src];
  if (!entry) return { src };
  const fallback = entry.variants.find(v => v.width >= 960) || entry.variants.at(-1)!;
  return { src: fallback.src, srcSet: entry.variants.map(v => `${v.src} ${v.width}w`).join(', '), sizes };
}
