// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://therebelape.com',
  trailingSlash: "always",
  vite: {
    plugins: [tailwindcss()]
  }
});