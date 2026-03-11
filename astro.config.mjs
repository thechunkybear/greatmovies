import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

export default defineConfig({
  integrations: [vue()],
  output: 'static',
  site: 'https://thechunkybear.github.io',
  base: '/greatmovies',
});
