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

const config: ExpoConfig = {
  name: variant.name,
  slug: 'football-club-management',
  version: '0.0.0',
  scheme: variant.scheme,
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: applicationId,
  },
  android: {
    package: applicationId,
  },
  plugins: ['expo-router', ['expo-splash-screen', { backgroundColor: '#ffffff' }]],
};

export default config;
