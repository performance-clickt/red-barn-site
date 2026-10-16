import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as cheerio from 'cheerio';
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
