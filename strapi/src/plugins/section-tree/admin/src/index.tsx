import type { StrapiApp } from '@strapi/strapi/admin';
import { SectionTreeInput } from './components/SectionTreeInput';

export default {
  register(app: StrapiApp) {
    app.customFields.register({
      name: 'section-tree-field',
      pluginId: 'section-tree',
      type: 'json',
      intlLabel: {
        id: 'section-tree.label',
        defaultMessage: 'Section Tree',
      },
      intlDescription: {
        id: 'section-tree.description',
        defaultMessage: 'Select sections from a visual tree',
      },
      components: {
        Input: async () => ({ default: SectionTreeInput }),
      },
    });
  },
};
