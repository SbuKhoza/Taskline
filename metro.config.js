const path = require("node:path")
const { getDefaultConfig } = require("expo/metro-config")
const { withNativewind } = require("nativewind/metro")

const config = withNativewind(getDefaultConfig(__dirname))

/**
 * Workaround for react-native-css 3.1.0-rc.1 + React Native 0.88:
 * NativeWind swaps every `import ... from "react-native"` for its own wrapper, but that wrapper
 * has a fixed export list that is missing RN 0.88's new `AssetRegistry`. Third-party packages
 * such as expo-asset (used by @expo/vector-icons for fonts) then get `undefined` and crash with
 * "Cannot read property 'getAssetByID' of undefined".
 *
 * Only your own source files need the className-enabled components, so imports of "react-native"
 * coming from node_modules are resolved to the real react-native instead.
 * Remove this once react-native-css ships a fix.
 */
const NODE_MODULES = `${path.sep}node_modules${path.sep}`
const nativewindResolver = config.resolver.resolveRequest
const internalOrigin = path.join(__dirname, "node_modules", "react-native-css", "dist", "internal.js")

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-native" && context.originModulePath.includes(NODE_MODULES)) {
    // NativeWind passes through requests that originate from its own files
    return nativewindResolver({ ...context, originModulePath: internalOrigin }, moduleName, platform)
  }
  return nativewindResolver(context, moduleName, platform)
}

module.exports = config