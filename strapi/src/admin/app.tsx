import type { StrapiApp } from '@strapi/strapi/admin';

export default {
  config: {
    locales: ['ru'],
  },
  register(app: StrapiApp) {
    // CKEditor plugin registers itself automatically
    app.addMenuLink({
      to: '/plugins/content-stats',
      icon: () => '📊',
      permissions: [],
      intlLabel: {
        id: 'content-stats.label',
        defaultMessage: 'Статистика',
      },
      Component: async () => {
        const { StatsPage } = await import('./pages/StatsPage');
        return { default: StatsPage };
      },
      position: 2,
    });
  },
  bootstrap(_app: StrapiApp) {},
};