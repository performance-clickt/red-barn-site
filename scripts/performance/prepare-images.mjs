import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

// Originals remain CMS-managed. Derived filenames change when bytes or settings change.
const output = 'public/optimized';
await fs.mkdir(output, { recursive: true });
const manifest = {};
async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (/\.webp$/i.test(file)) {
      const bytes = await fs.readFile(file);
      const metadata = await sharp(bytes).metadata();
      const width = metadata.width;
      if (!width) continue;
      const logo = /logo/i.test(file);
      const quality = logo ? 90 : 78;
      const hash = crypto.createHash('sha256').update(bytes).update(`webp-${quality}-v1`).digest('hex').slice(0, 20);
      const widths = [...new Set([320, 480, 640, 960, 1280, Math.min(width, 1920)].filter(w => w <= width))].sort((a,b) => a-b);
      const variants = [];
      for (const w of widths) {
        const name = `${hash}-${w}.webp`;
        try { await fs.access(path.join(output, name)); }
        catch { await sharp(bytes).resize({ width: w, withoutEnlargement: true }).webp({ quality, effort: 5 }).toFile(path.join(output, name)); }
        variants.push({ width: w, src: `/optimized/${name}` });
      }
      manifest['/' + file.replace(/^public\//, '')] = { variants, width, height: metadata.height };
    }
  }
}
await walk('public/images');
await fs.writeFile('public/optimized/manifest.json', JSON.stringify(manifest));
console.log(`Prepared responsive variants for ${Object.keys(manifest).length} images.`);
