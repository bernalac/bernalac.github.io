import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://bernalac.github.io',
  viewTransitions: true,
  vite: {
    plugins: [tailwindcss()]
  }
});