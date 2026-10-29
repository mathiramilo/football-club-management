import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import packageJson from './package.json' with { type: 'json' };

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  env: { NEXT_PUBLIC_APP_VERSION: packageJson.version },
};

export default createNextIntlPlugin()(nextConfig);
