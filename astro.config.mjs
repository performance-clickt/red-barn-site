import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  site: 'https://www.redbarninvestmentcounsel.ca',
  devToolbar: { enabled: false },
  integrations: [react(), ...(process.env.NODE_ENV === 'production' ? [] : [keystatic()])],
  vite: { plugins: [tailwindcss()] },
  server: { host: '127.0.0.1', port: 4321 },
});
