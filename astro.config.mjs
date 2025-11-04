// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://therebelape.com',
  trailingSlash: "always",  // COMMIT TO THIS
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()]
  }
});