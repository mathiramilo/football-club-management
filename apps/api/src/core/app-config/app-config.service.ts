import { Injectable } from '@nestjs/common';
import type { AppConfigResponse, Platform } from '@repo/contracts';

import type { ClientInfo } from '../client/client-info.js';
import { Clock } from '../clock/clock.js';
import { AppConfigRepository } from './app-config.repository.js';
import { compareAppVersions } from './app-versions.js';

export const APP_CONFIG_CACHE_MS = 60_000;

interface PlatformConfig {
  minimumVersion: string | null;
  storeUrl: string | null;
}

type PlatformConfigs = Record<Platform, PlatformConfig>;

function isBelowMinimum(configs: PlatformConfigs, { platform, appVersion }: ClientInfo): boolean {
  if (!platform || !appVersion) return false;
  const { minimumVersion } = configs[platform];
  return minimumVersion !== null && compareAppVersions(appVersion, minimumVersion) < 0;
}

// store_url is set by hand until the back-office (TECH-12): a link the response schema would reject
// is dropped rather than failing app-config for every app, outdated ones included.
const parsableUrl = (url: string | null) => (url !== null && URL.canParse(url) ? url : null);

@Injectable()
export class AppConfigService {
  private cache?: { loadedAt: number; configs: Promise<PlatformConfigs> };

  constructor(
    private readonly repository: AppConfigRepository,
    private readonly clock: Clock,
  ) {}

  async forClient(client: ClientInfo): Promise<AppConfigResponse> {
    const configs = await this.platformConfigs();
    const { ios, android, web } = configs;
    return {
      minimumVersions: {
        ios: ios.minimumVersion,
        android: android.minimumVersion,
        web: web.minimumVersion,
      },
      updateRequired: isBelowMinimum(configs, client),
      storeUrls: { ios: ios.storeUrl, android: android.storeUrl },
    };
  }

  async isOutdated(client: ClientInfo): Promise<boolean> {
    return isBelowMinimum(await this.platformConfigs(), client);
  }

  private platformConfigs(): Promise<PlatformConfigs> {
    const now = this.clock.now().getTime();
    const age = this.cache ? now - this.cache.loadedAt : Infinity;
    // A clock that steps back expires the cache instead of keeping it until the clock catches up.
    if (this.cache && age >= 0 && age < APP_CONFIG_CACHE_MS) return this.cache.configs;

    const configs = this.load();
    this.cache = { loadedAt: now, configs };
    configs.catch(() => {
      if (this.cache?.configs === configs) this.cache = undefined;
    });
    return configs;
  }

  private async load(): Promise<PlatformConfigs> {
    const rows = await this.repository.findAll();
    const configOf = (platform: Platform): PlatformConfig => {
      const row = rows.find((candidate) => candidate.platform === platform);
      return {
        minimumVersion: row?.minimumVersion ?? null,
        storeUrl: parsableUrl(row?.storeUrl ?? null),
      };
    };
    return { ios: configOf('ios'), android: configOf('android'), web: configOf('web') };
  }
}
