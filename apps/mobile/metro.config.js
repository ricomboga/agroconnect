const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.resolver.unstable_enablePackageExports = true;

config.watchFolders = [
  path.resolve(workspaceRoot, 'node_modules/.pnpm'),
  path.resolve(workspaceRoot, 'packages'),
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.extraNodeModules = {
  'better-sqlite3': path.resolve(projectRoot, 'src/utils/emptyShim.js'),
};

const EMPTY_SHIM = path.resolve(projectRoot, 'src/utils/emptyShim.js');
const SECURE_STORE_SHIM = path.resolve(projectRoot, 'src/utils/secureStoreWebShim.js');
// Normalised pnpm store path for react-native
const RN_PNPM_DIR = path.resolve(workspaceRoot, 'node_modules/.pnpm').replace(/\\/g, '/');

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    // Intercept any module whose origin is inside the native react-native pnpm store
    const origin = (context.originModulePath || '').replace(/\\/g, '/');
    if (origin.includes('/.pnpm/react-native@') && origin.includes('/node_modules/react-native/')) {
      // Provide empty shim for all imports from within native react-native on web
      return { type: 'sourceFile', filePath: EMPTY_SHIM };
    }

    if (moduleName === 'expo-secure-store') {
      return { type: 'sourceFile', filePath: SECURE_STORE_SHIM };
    }

    if (moduleName === 'react-native' || moduleName === 'react-native/index') {
      const resolve = originalResolveRequest || context.resolveRequest;
      return (originalResolveRequest || context.resolveRequest)(
        { ...context, resolveRequest: undefined },
        'react-native-web',
        platform,
      );
    }
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
