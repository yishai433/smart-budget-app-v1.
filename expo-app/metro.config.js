// Metro config for Expo.
// Firebase JS SDK v10 ships an "exports" map that Metro's package-exports
// resolution picks the browser build from, which breaks React Native auth
// ("Component auth has not been registered yet"). Disabling package exports
// and adding the .cjs extension makes Metro load Firebase's RN-compatible
// build, so Auth + AsyncStorage persistence work.
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)
config.resolver.sourceExts.push('cjs')
config.resolver.unstable_enablePackageExports = false

module.exports = config
