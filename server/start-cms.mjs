import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const directory=process.env.EMDASH_DATA_DIR || './data';
await fs.mkdir(directory,{recursive:true});
const keyFile=path.join(directory,'encryption.key');
if(!process.env.EMDASH_ENCRYPTION_KEY) {
 try {process.env.EMDASH_ENCRYPTION_KEY=(await fs.readFile(keyFile,'utf8')).trim();}
 catch(error){if(error.code!=='ENOENT')throw error;const key='emdash_enc_v1_'+crypto.randomBytes(32).toString('base64url');await fs.writeFile(keyFile,key+'\n',{mode:0o600,flag:'wx'});process.env.EMDASH_ENCRYPTION_KEY=key;}
}
await import('../scripts/emdash/import-content.mjs');
await import('../dist/server/entry.mjs');
