import fs from 'node:fs/promises';
const resources=JSON.parse(await fs.readFile('migration/seo/resources.json','utf8'));
for(const r of resources){await fs.mkdir('dist/s',{recursive:true});await fs.copyFile('public'+r.local,'dist'+r.path);}
