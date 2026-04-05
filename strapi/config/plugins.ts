import type { Core } from '@strapi/strapi';

/**
 * Upload: Sharp для ресайза и оптимизации (sizeOptimization).
 * @see https://docs.strapi.io/dev-docs/plugins/upload
 */
const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  upload: {
    config: {
      provider: 'local',
      sizeOptimization: true,
      responsiveDimensions: true,
      breakpoints: {
        xlarge: 1920,
        large: 1000,
        medium: 750,
        small: 500,
        xsmall: 64,
      },
      providerOptions: {
        localServer: {
          maxage: env.int('UPLOAD_MAX_AGE', 300000),
        },
      },
    },
  },
});

export default config;
