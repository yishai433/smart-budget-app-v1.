// Metro config for Expo.
//
// Two conflicting needs around Node "package exports":
//  - React Native 0.81 needs package exports ON (its own internals, e.g.
//    react-native/react-private-interface, are exposed only through them).
//  - Firebase JS SDK v10 needs them OFF — with them on, Metro picks Firebase's
//    browser build and Auth fails to register ("Component auth has not been
//    registered yet"), also dropping AsyncStorage persistence.
//
// So we keep package exports ON globally and turn them OFF for Firebase only,
// via a per-request resolver override.
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)
config.resolver.sourceExts.push('cjs')

const baseResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'firebase' || moduleName.startsWith('firebase/') || moduleName.startsWith('@firebase/')) {
    return context.resolveRequest(
      { ...context, unstable_enablePackageExports: false },
      moduleName,
      platform,
    )
  }
  return (baseResolveRequest || context.resolveRequest)(context, moduleName, platform)
}

module.exports = config
