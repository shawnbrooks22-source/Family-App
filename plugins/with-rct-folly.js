/**
 * Config plugin that patches react-native-iap's podspec to remove the
 * RCT-Folly dependency. In React Native 0.76+, Folly is bundled inside
 * the ReactNativeDependencies prebuilt tarball — it is no longer published
 * as a standalone CocoaPod, so react-native-iap's explicit dependency on it
 * causes pod install to fail. Removing the declaration is safe: the Folly
 * headers are still available at compile time through React-Core-prebuilt.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withRNIapFollyPatch(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podspecPath = path.join(
        config.modRequest.projectRoot,
        'node_modules',
        'react-native-iap',
        'RNIap.podspec'
      );

      if (!fs.existsSync(podspecPath)) {
        console.warn('[withRNIapFollyPatch] RNIap.podspec not found — skipping patch');
        return config;
      }

      let podspec = fs.readFileSync(podspecPath, 'utf8');

      if (podspec.includes("RCT-Folly")) {
        // Remove the RCT-Folly dependency line(s)
        podspec = podspec.replace(/[ \t]*s\.dependency\s+['"]RCT-Folly['"][^\n]*\n?/g, '');
        fs.writeFileSync(podspecPath, podspec);
        console.log('[withRNIapFollyPatch] Removed RCT-Folly from RNIap.podspec');
      } else {
        console.log('[withRNIapFollyPatch] RCT-Folly not found in podspec — no patch needed');
      }

      return config;
    },
  ]);
};
