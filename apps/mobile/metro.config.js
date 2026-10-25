const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

module.exports = withNativewind(getDefaultConfig(__dirname), {
  inlineRem: 16,
  inlineVariables: { exclude: ['--club', '--club-tint'] },
});
