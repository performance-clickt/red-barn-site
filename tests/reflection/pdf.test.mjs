import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { calculateReflection } from '../../src/lib/reflection/score.ts';
import { createReflectionPdf } from '../../src/lib/reflection/pdf.ts';
const font = readFileSync(new URL('../../public/fonts/reflection-work-sans-400.woff', import.meta.url));
const cases = JSON.parse(readFileSync(new URL('./observed-test-cases.json', import.meta.url)));
for (const fixture of cases.slice(0, 6)) test(`PDF exports ${fixture.expectedArchetype}`, async () => {
  const bytes = await createReflectionPdf(calculateReflection(fixture.answers), 'Reflection test — Émilie', font);
  assert.equal(Buffer.from(bytes).subarray(0, 4).toString(), '%PDF');
  const document = await PDFDocument.load(bytes);
  assert.ok(document.getPageCount() >= 2 && document.getPageCount() <= 4);
  assert.equal(document.getTitle(), 'Your Financial Values Reflection');
  writeFileSync(`/tmp/reflection-${fixture.id}.pdf`, bytes);
});
