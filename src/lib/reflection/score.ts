import content from './content.json' with { type: 'json' };

// Behavioural reconstruction from the handoff, not recovered Lovable source.
export const TIE_PRIORITY = ['stewardship', 'connection', 'growth', 'faith'] as const;
export function calculateReflection(answers: readonly number[]) {
  if (!Array.isArray(answers) || answers.length !== content.questions.length ||
      Array.from(answers).some(answer => !Number.isInteger(answer) || answer < 1 || answer > 5)) {
    throw new Error('Exactly 12 integer answers from 1 to 5 are required.');
  }
  const themes = content.themes.map(theme => {
    const values = content.questions.flatMap((question, index) => question.theme === theme.id ? [answers[index]] : []);
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    return { ...theme, average, display: average.toFixed(1) };
  });
  const priority = (id: string) => TIE_PRIORITY.findIndex(theme => theme === id);
  const top = [...themes].sort((a, b) => b.average - a.average || priority(a.id) - priority(b.id)).slice(0, 2);
  const archetype = content.archetypes.find(result => result.themes.every(theme => top.some(t => t.id === theme)));
  if (!archetype) throw new Error('No archetype matches the selected themes.');
  const overallAverage = answers.reduce((sum, value) => sum + value, 0) / answers.length;
  return { themes, archetype, overallAverage, overallDisplay: overallAverage.toFixed(1) };
}
export type ReflectionResult = ReturnType<typeof calculateReflection>;
