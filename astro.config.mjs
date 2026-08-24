import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://agent-world.bayjf.com',
  integrations: [react()],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh'],
    routing: {
      // English stays at the root; only Chinese carries a prefix.
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
});
