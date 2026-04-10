import type { StrapiApp } from '@strapi/strapi/admin';

export default {
  config: {
    locales: ['ru'],
  },
  register(_app: StrapiApp) {
    // CKEditor plugin registers itself automatically
    // Default presets (HTML + Markdown) are available out of the box
  },
  bootstrap(_app: StrapiApp) {},
};