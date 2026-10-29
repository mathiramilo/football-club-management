import 'server-only';

const linkPaths = ['/e/*', '/j/*', '/c/*'];

const listFrom = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const appIds = () => listFrom(process.env.APP_LINKS_APP_IDS);

export function appleAppSiteAssociation() {
  const teamId = process.env.APPLE_TEAM_ID;
  return {
    applinks: {
      details: teamId
        ? [
            {
              appIDs: appIds().map((appId) => `${teamId}.${appId}`),
              components: linkPaths.map((path) => ({ '/': path })),
            },
          ]
        : [],
    },
  };
}

export function androidAssetLinks() {
  const fingerprints = listFrom(process.env.ANDROID_CERT_FINGERPRINTS);
  if (fingerprints.length === 0) return [];
  return appIds().map((packageName) => ({
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: packageName,
      sha256_cert_fingerprints: fingerprints,
    },
  }));
}
