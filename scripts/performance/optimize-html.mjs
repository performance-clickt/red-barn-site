import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
const manifest = JSON.parse(await fs.readFile('public/optimized/manifest.json', 'utf8'));
let count = 0;
async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (file.endsWith('.html')) {
      const $ = cheerio.load(await fs.readFile(file, 'utf8'));
      $('img[src]').each((_, el) => {
        const img = $(el);
        // React owns these attributes; its server props already contain variants.
        if (img.closest('astro-island').length) return;
        const image = manifest[img.attr('src')];
        if (!image) return;
        // Reserve the original aspect ratio, including for auto-sized lazy images.
        if (!img.attr('width') && !img.attr('height')) {
          img.attr('width', String(image.width));
          img.attr('height', String(image.height));
        }
        let sizes = '(max-width: 640px) 90vw, (max-width: 1024px) 88vw, 1200px';
        if (img.closest('.brand').length) sizes = '(max-width: 640px) 185px, 300px';
        else if (img.closest('.family-photo,.values-section,.investment-detail,.advisor-section').length) sizes = '(max-width: 640px) 90vw, 45vw';
        else if (img.closest('.season').length) sizes = '(max-width: 1024px) 45vw, 24vw';
        // Native auto sizing uses actual rendered width for lazy-loaded images.
        // Conservative fallback covers browsers that do not support it.
        if (img.attr('loading') === 'lazy') sizes = 'auto, ' + sizes;
        const fallback = image.variants.find(v => v.width >= 960) || image.variants.at(-1);
        img.attr('src', fallback.src);
        img.attr('srcset', image.variants.map(v => `${v.src} ${v.width}w`).join(', '));
        img.attr('sizes', sizes);
        count++;
      });
      await fs.writeFile(file, $.html());
    }
  }
}
await walk('dist');
// Internal build metadata does not need to be public.
await fs.rm('dist/optimized/manifest.json', { force: true });
console.log(`Added responsive sources to ${count} static images.`);
