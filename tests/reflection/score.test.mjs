import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateReflection, TIE_PRIORITY } from '../../src/lib/reflection/score.ts';
const cases = JSON.parse(readFileSync(new URL('./observed-test-cases.json', import.meta.url)));
for (const fixture of cases) test(`observed case ${fixture.id}: ${fixture.expectedArchetype}`, () => {
  const result = calculateReflection(fixture.answers);
  assert.equal(result.archetype.name, fixture.expectedArchetype);
  assert.deepEqual(result.themes.map(theme => theme.display), fixture.expectedThemeDisplays);
  assert.equal(result.overallDisplay, fixture.expectedOverallDisplay);
  assert.deepEqual(result.archetype.themes, TIE_PRIORITY.filter(theme => result.archetype.themes.includes(theme)));
});
test('explicit ties, validation, and edited answers', () => {
  assert.deepEqual(TIE_PRIORITY, ['stewardship', 'connection', 'growth', 'faith']);
  for (const invalid of [[], Array(12), Array(11).fill(3), [...Array(11).fill(3), null], [...Array(11).fill(3), 1.5], [...Array(11).fill(3), 6]]) {
    assert.throws(() => calculateReflection(invalid));
  }
  const answers = Array(12).fill(3);
  assert.equal(calculateReflection(answers).archetype.id, 'guardian');
  answers[6] = 5;
  assert.equal(calculateReflection(answers).archetype.id, 'mentor');
  assert.equal(answers[6], 5);
});
