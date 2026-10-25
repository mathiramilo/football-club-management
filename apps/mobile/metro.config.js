const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativewind } = require('nativewind/metro');

module.exports = withNativewind(getSentryExpoConfig(__dirname), {
  inlineRem: 16,
  inlineVariables: { exclude: ['--club', '--club-tint'] },
});
