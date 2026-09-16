import { createReader } from '@keystatic/core/reader';
import config from '../../keystatic.config';
import Markdoc from '@markdoc/markdoc';
export const reader = createReader(process.cwd(), config);
export async function renderBody(entry: { content: () => Promise<{ node: unknown }> }) {
  const { node } = await entry.content();
  return Markdoc.renderers.html(Markdoc.transform(node as Parameters<typeof Markdoc.transform>[0])).replace(/^<article>/, '').replace(/<\/article>$/, '');
}
export function shortTitle(title: string) { return title.split(/\s[|—]\s/)[0]; }
