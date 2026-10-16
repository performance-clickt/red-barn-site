import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as cheerio from 'cheerio';
import { prosemirrorToPortableText } from 'emdash';
import { renderRichText } from '../../src/lib/cms-rich-text.mjs';
const seed=JSON.parse(fs.readFileSync('seed/red-barn.json','utf8'));
const originals=JSON.parse(fs.readFileSync('tests/emdash/original-html.json','utf8'));
for(const name of ['pages','posts']) for(const entry of seed.content[name]) {
 test(`${name}/${entry.slug}: migrated rich text preserves the original markup`,()=>{
  assert.equal(cheerio.load(renderRichText(entry.data.content),null,false).html(),cheerio.load(originals[`${name}/${entry.slug}`],null,false).html());
 });
}
test('rich text and HTML blocks cannot execute scripts',()=>{
 const value=[{_type:'htmlBlock',_key:'test',html:'<p onclick="alert(1)">Text<script>alert(1)</script><a href="javascript:alert(1)">Link</a></p>'}];
 assert.equal(renderRichText(value),'<p>Text<a>Link</a></p>');
});

test('tables created in the editor render without breaking the page',()=>{
 const doc={type:'doc',content:[{type:'table',content:[{type:'tableRow',content:[{type:'tableHeader',attrs:{colspan:1,rowspan:1},content:[{type:'paragraph',content:[{type:'text',text:'Heading'}]}]},{type:'tableCell',attrs:{colspan:1,rowspan:1},content:[{type:'paragraph',content:[{type:'text',text:'Value'}]}]}]}]}]};
 assert.equal(renderRichText(prosemirrorToPortableText(doc)),'<table><tbody><tr><th><p>Heading</p></th><td><p>Value</p></td></tr></tbody></table>');
});
