// Patch react-native-web's UIManager — native-stack calls hasViewManagerConfig
// which doesn't exist in the web implementation. Returning false makes
// react-native-screens fall back to plain View wrappers on web.
if (typeof window !== 'undefined') {
  const RN = require('react-native');
  if (RN.UIManager && typeof RN.UIManager.hasViewManagerConfig !== 'function') {
    RN.UIManager.hasViewManagerConfig = (_name) => false;
  }
}

const { registerRootComponent } = require('expo');
const { default: App } = require('./App');

registerRootComponent(App);
