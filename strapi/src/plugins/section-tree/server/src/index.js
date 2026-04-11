'use strict';

module.exports = {
  /**
   * @param {{ strapi: import('@strapi/strapi').Core.Strapi }} opts
   */
  register({ strapi }) {
    strapi.customFields.register({
      name: 'section-tree-field',
      plugin: 'section-tree',
      type: 'json',
      inputSize: {
        default: 12,
        isResizable: true,
      },
    });
  },
};
