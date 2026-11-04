export default {
  extends: ['@commitlint/config-conventional'],
  // Dependabot capitalizes "Bump" after the configured prefix, and its commit message format has no option to change that.
  ignores: [(message) => message.includes('Signed-off-by: dependabot[bot] <support@github.com>')],
};
