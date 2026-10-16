import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import emdash, { local } from 'emdash/astro';
import { sqlite } from 'emdash/db';
import fs from 'node:fs';
const dataDir=process.env.EMDASH_DATA_DIR || './data';
fs.mkdirSync(dataDir,{recursive:true});
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  output: 'server',
  adapter: node({mode:'standalone'}),
  session:{driver:'fs',options:{base:`${dataDir}/sessions`}},
  site: 'https://www.redbarninvestmentcounsel.ca',
  trailingSlash: 'never',
  // Local preview convenience; real HTTP redirects are implemented in Nginx.
  redirects: { '/about': '/our-story', '/home': '/', '/new-dropdown': '/insights' },
  devToolbar: { enabled: false },
  integrations: [react(), emdash({
    database:sqlite({url:`file:${dataDir}/emdash.db`}),
    storage:local({directory:`${dataDir}/uploads`,baseUrl:'/_emdash/api/media/file'}),
    siteUrl:process.env.EMDASH_SITE_URL,
    toolbar:false,
  })],
  vite: { plugins: [tailwindcss()] },
  server: { host: '127.0.0.1', port: 4321 },
});
