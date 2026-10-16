import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

// Preserve the exact deployed bytes: encoders can differ across OS/CPU versions.
// New source images still get new hashes through prepare-images.mjs.
const archive='seed/optimized-baseline.tar.gz';
const expected='ccbbdfb250b0d8ad13ece461490685723f6ccf82b4da75da5a13a71eeb2c2a8b';
const hash=crypto.createHash('sha256').update(await fs.readFile(archive)).digest('hex');
if(hash!==expected)throw new Error('Staging image baseline checksum mismatch');
execFileSync('tar',['-xzf',archive,'-C','public']);
console.log('Restored exact staging responsive images from b18805f.');
