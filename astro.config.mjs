import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://jodaz.vanguarddevs.com',
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en',
          es: 'es',
        },
      },
    }),
  ],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  // One-pager: old pages are hidden, not 404'd (static meta-refresh stubs)
  redirects: {
    '/about': '/',
    '/es/about': '/es',
    '/articles/santa-rosa': '/',
    '/es/articles/santa-rosa': '/es',
  },
  output: 'static',
});
