import type { Core } from '@strapi/strapi';

/** Действия Content API: find / findOne для публичного доступа */
const PUBLIC_ACTIONS = [
  'api::article.article.find',
  'api::article.article.findOne',
  'api::author.author.find',
  'api::author.author.findOne',
  'api::category.category.find',
  'api::category.category.findOne',
  'api::region.region.find',
  'api::region.region.findOne',
  'api::section.section.find',
  'api::section.section.findOne',
  'api::global-review.global-review.find',
  'plugin::upload.content-api.find',
  'plugin::upload.content-api.findOne',
] as const;

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'public' },
    });

    if (!publicRole) {
      strapi.log.warn('Public role not found; skip API permissions bootstrap.');
      return;
    }

    for (const action of PUBLIC_ACTIONS) {
      const existing = await strapi.db.query('plugin::users-permissions.permission').findOne({
        where: {
          action,
          role: publicRole.id,
        },
      });

      if (!existing) {
        await strapi.db.query('plugin::users-permissions.permission').create({
          data: {
            action,
            role: publicRole.id,
          },
        });
        strapi.log.info(`Public permission enabled: ${action}`);
      }
    }
  },
};
