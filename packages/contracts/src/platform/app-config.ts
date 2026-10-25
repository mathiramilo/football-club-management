import { z } from 'zod';

import { appVersion } from '../client/headers.js';

const minimumVersion = appVersion
  .nullable()
  .describe('The oldest version still served; null when every version is');

export const appConfigResponse = z
  .object({
    minimumVersions: z.object({
      ios: minimumVersion,
      android: minimumVersion,
      web: minimumVersion,
    }),
    updateRequired: z
      .boolean()
      .describe("Whether this request's X-App-Version is below the minimum for its X-Platform"),
    storeUrls: z.object({ ios: z.url().nullable(), android: z.url().nullable() }),
  })
  .meta({ id: 'AppConfigResponse' });

export type AppConfigResponse = z.infer<typeof appConfigResponse>;
