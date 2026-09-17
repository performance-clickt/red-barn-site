import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
// SHA-256 of the original files inside financial-values-handoff.zip, 2026-09-17.
for (const [file, expected] of [
  ['../../src/lib/reflection/content.json', '18a7cad43d7428990116a1e7e3069c3a7b0c0675c091932e92cb4cf601d4e55e'],
  ['./observed-test-cases.json', 'f32677c732e31536fb3286c4d7d957f75a1987ae63387457979885cfe1eaf8d9'],
]) test(`handoff copy remains exact: ${file}`, () => {
  assert.equal(createHash('sha256').update(readFileSync(new URL(file, import.meta.url))).digest('hex'), expected);
});
