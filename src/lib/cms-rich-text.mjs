import Markdoc from '@markdoc/markdoc';
import sanitizeHtml from 'sanitize-html';
import { portableTextToProsemirror, sanitizeHref } from 'emdash';

const safeHtml = html => sanitizeHtml(html, {
  allowedTags: ['p','h1','h2','h3','h4','h5','h6','ul','ol','li','strong','em','s','u','a','img','br','hr','blockquote','code','pre','table','thead','tbody','tr','th','td','details','summary'],
  allowedAttributes: { a: ['href','title','target','rel'], img: ['src','alt','title','width','height'], ol: ['start'], td: ['colspan','rowspan'], th: ['colspan','rowspan'] },
  allowedSchemes: ['http','https','mailto','tel'], allowProtocolRelative: false,
});
const tag = (name, attrs = {}, children = []) => new Markdoc.Tag(name, attrs, children);
const render = value => Markdoc.renderers.html(value);
function nodeHtml(node, tight = false) {
  const children = () => (node.content || []).map(n => nodeHtml(n, tight)).join('');
  switch (node.type) {
    case 'text': {
      let value = node.text || '';
      for (const mark of [...(node.marks || [])].reverse()) {
        const names = { bold: 'strong', italic: 'em', strike: 's', underline: 'u', code: 'code' };
        if (names[mark.type]) value = tag(names[mark.type], {}, [value]);
        else if (mark.type === 'link') value = tag('a', { href: sanitizeHref(mark.attrs?.href || ''), ...(mark.attrs?.title ? {title: mark.attrs.title}: {}), ...(mark.attrs?.target === '_blank' ? {target:'_blank',rel:'noopener noreferrer'} : {}) }, [value]);
      }
      return render(value);
    }
    case 'hardBreak': return '<br>';
    case 'paragraph': return tight ? children() : `<p>${children()}</p>`;
    case 'heading': return `<h${node.attrs.level}>${children()}</h${node.attrs.level}>`;
    case 'bulletList': return `<ul>${(node.content || []).map(n => nodeHtml(n,true)).join('')}</ul>`;
    case 'orderedList': return `<ol${node.attrs?.start > 1 ? ` start="${Number(node.attrs.start)}"` : ''}>${(node.content || []).map(n => nodeHtml(n,true)).join('')}</ol>`;
    case 'listItem': return `<li>${children()}</li>`;
    case 'blockquote': return `<blockquote>${children()}</blockquote>`;
    case 'horizontalRule': return '<hr>';
    case 'image': return `<p>${render(tag('img', {src:node.attrs?.src || '',alt:node.attrs?.alt || '', ...(node.attrs?.title ? {title:node.attrs.title}:{})}))}</p>`;
    case 'codeBlock': return `<pre><code>${children()}</code></pre>`;
    case 'table': return `<table><tbody>${children()}</tbody></table>`;
    case 'tableRow': return `<tr>${children()}</tr>`;
    case 'tableCell':
    case 'tableHeader': {
      const name=node.type==='tableHeader'?'th':'td';
      const span=key=>Number.isSafeInteger(node.attrs?.[key]) && node.attrs[key]>1 ? ` ${key}="${node.attrs[key]}"` : '';
      return `<${name}${span('colspan')}${span('rowspan')}>${children()}</${name}>`;
    }
    case 'htmlBlock': return safeHtml(node.attrs?.html || '');
    default: throw new Error(`Unsupported EmDash content node: ${node.type}`);
  }
}
/** Keep the existing site's HTML structure, with no CMS wrapper elements or styles. */
export function renderRichText(blocks) {
  return (portableTextToProsemirror(blocks || []).content || []).map(n => nodeHtml(n)).join('');
}
