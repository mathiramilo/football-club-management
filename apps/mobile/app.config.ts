import type { ExpoConfig } from 'expo/config';

const variants = {
  development: { name: 'FCM Dev', suffix: '.dev', scheme: 'footballclub-dev' },
  preview: { name: 'FCM Preview', suffix: '.preview', scheme: 'footballclub-preview' },
  staging: { name: 'FCM Staging', suffix: '.staging', scheme: 'footballclub-staging' },
  production: { name: 'Football Club Management', suffix: '', scheme: 'footballclub' },
} as const;

type Variant = keyof typeof variants;

const isVariant = (value: string | undefined): value is Variant =>
  value !== undefined && value in variants;

const variantName = process.env.APP_VARIANT ?? 'development';
if (!isVariant(variantName)) {
  throw new Error(`APP_VARIANT must be one of ${Object.keys(variants).join(', ')}`);
}
const variant = variants[variantName];

// OQ-03: placeholder identifier until the product name is chosen; it changes here only.
const applicationId = `com.footballclubmanagement.app${variant.suffix}`;

const appleTeamId = process.env.APPLE_TEAM_ID;
const easProjectId = process.env.EAS_PROJECT_ID;
const webUrl = process.env.EXPO_PUBLIC_WEB_URL;
const linkHost = webUrl ? new URL(webUrl).host : undefined;
const linkPathPrefixes = ['/e/', '/j/', '/c/'];
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const googleIosUrlScheme =
  googleIosClientId &&
  `com.googleusercontent.apps.${googleIosClientId.replace('.apps.googleusercontent.com', '')}`;

const config: ExpoConfig = {
  name: variant.name,
  slug: 'football-club-management',
  version: '0.0.0',
  scheme: variant.scheme,
  orientation: 'portrait',
  runtimeVersion: { policy: 'fingerprint' },
  ...(easProjectId && {
    updates: { url: `https://u.expo.dev/${easProjectId}` },
    extra: { eas: { projectId: easProjectId } },
  }),
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: applicationId,
    appleTeamId: appleTeamId === '' ? undefined : appleTeamId,
    usesAppleSignIn: true,
    ...(linkHost && { associatedDomains: [`applinks:${linkHost}`] }),
  },
  android: {
    package: applicationId,
    ...(linkHost && {
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: linkPathPrefixes.map((pathPrefix) => ({
            scheme: 'https',
            host: linkHost,
            pathPrefix,
          })),
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    }),
  },
  plugins: [
    'expo-router',
    ['expo-splash-screen', { backgroundColor: '#ffffff' }],
    'expo-apple-authentication',
    [
      '@sentry/react-native/expo',
      {
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        disableAutoUpload: !process.env.SENTRY_AUTH_TOKEN,
      },
    ],
    ...(googleIosUrlScheme
      ? [
          [
            '@react-native-google-signin/google-signin',
            { iosUrlScheme: googleIosUrlScheme },
          ] satisfies [string, unknown],
        ]
      : []),
  ],
};

export default config;
