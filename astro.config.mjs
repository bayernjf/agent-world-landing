import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://agent-world.bayjf.com',
  integrations: [react()],
});
