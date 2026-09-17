import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import content from './content.json' with { type: 'json' };
import type { ReflectionResult } from './score';

// New Red Barn export layout. No original PDF was captured in the handoff.
export async function createReflectionPdf(result: ReflectionResult, name: string, fontBytes: Uint8Array) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true });
  const red = rgb(176 / 255, 31 / 255, 41 / 255);
  const ink = rgb(52 / 255, 46 / 255, 46 / 255);
  let page = pdf.addPage([595.28, 841.89]);
  let y = 774;
  const width = 483;
  const addPage = () => { page = pdf.addPage([595.28, 841.89]); y = 774; };
  const lines = (text: string, size: number) => {
    const output: string[] = [];
    let line = '';
    for (const word of text.split(/\s+/)) {
      if (font.widthOfTextAtSize(word, size) > width) {
        if (line) { output.push(line); line = ''; }
        for (const char of word) {
          if (font.widthOfTextAtSize(line + char, size) > width) { output.push(line); line = ''; }
          line += char;
        }
      } else if (line && font.widthOfTextAtSize(`${line} ${word}`, size) > width) {
        output.push(line); line = word;
      } else line += `${line ? ' ' : ''}${word}`;
    }
    if (line) output.push(line);
    return output;
  };
  const text = (value: string, size = 11, heading = false) => {
    const wrapped = lines(value, size);
    if (heading && y - (wrapped.length * size * 1.5 + 40) < 60) addPage();
    for (const line of wrapped) {
      if (y < 64) addPage();
      page.drawText(line, { x: 56, y, font, size, color: heading ? red : ink });
      y -= size * 1.5;
    }
    y -= heading ? 12 : 10;
  };
  const labels = content.resultLabels;
  text('RED BARN / INVESTMENT COUNSEL', 10, true);
  text(labels.status, 11);
  text(labels.title, 27, true);
  if (name.trim()) text(name.trim(), 14);
  text(labels.archetype, 11);
  text(result.archetype.name, 24, true);
  text(result.archetype.tagline, 14);
  text(result.archetype.themes.map(id => content.themes.find(t => t.id === id)!.name).join(' + '));
  text(labels.summary, 16, true);
  text(result.archetype.summary);
  text(labels.selfQuestions, 16, true);
  result.archetype.selfQuestions.forEach(q => text(q));
  text(labels.familyQuestions, 16, true);
  result.archetype.familyQuestions.forEach(q => text(q));
  text(labels.scores, 16, true);
  result.themes.forEach(theme => text(`${theme.name} — ${theme.description}: ${theme.display}/5`));
  text(`${labels.overall}: ${result.overallDisplay}/5`, 13);
  text(labels.agenda, 20, true);
  text(labels.agendaSubtitle, 13);
  content.agenda.forEach(item => { text(`${item.segment} · ${item.duration}`, 13, true); text(item.purpose); });
  text(labels.nextSteps, 16, true);
  content.nextSteps.forEach((step, index) => text(`${index + 1}. ${step}`));
  text(content.footer, 9);
  pdf.getPages().forEach((p, index) => {
    p.drawLine({ start: { x: 56, y: 45 }, end: { x: 539, y: 45 }, color: red, thickness: .5 });
    p.drawText(`Red Barn · Financial Values Reflection · ${index + 1} / ${pdf.getPageCount()}`, { x: 56, y: 29, font, size: 8, color: ink });
  });
  pdf.setTitle(labels.title);
  pdf.setAuthor('Red Barn Investment Counsel');
  return pdf.save();
}
