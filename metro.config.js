const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * Block @opentelemetry packages from being bundled.
 *
 * @supabase/supabase-js pulls in @opentelemetry as an optional dependency.
 * Those packages use dynamic import(variable) syntax that Hermes (React Native's
 * JS engine) doesn't support, causing "Invalid expression encountered" at build time.
 * We don't use OpenTelemetry directly, so replacing with empty modules is safe.
 */
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@opentelemetry/')) {
    return { type: 'empty' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
