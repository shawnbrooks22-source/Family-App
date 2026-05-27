/**
 * Config plugin that adds RCT-Folly pod to the iOS Podfile.
 * Required because react-native-iap still depends on RCT-Folly,
 * which is no longer a standalone CocoaPod in React Native 0.76+
 * (it's now bundled in the ReactNativeDependencies prebuilt tarball).
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withRCTFolly(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      const follyLine = "  pod 'RCT-Folly', :podspec => '../node_modules/react-native/third-party-podspecs/RCT-Folly.podspec'";

      if (!podfile.includes("RCT-Folly")) {
        // Insert just before use_expo_modules! so it's in the right target block
        podfile = podfile.replace(
          /(\s+use_expo_modules!)/,
          `\n${follyLine}\n$1`
        );
        fs.writeFileSync(podfilePath, podfile);
        console.log('[withRCTFolly] Added RCT-Folly pod to Podfile');
      }

      return config;
    },
  ]);
};
