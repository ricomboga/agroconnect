// Expo's Babel transform replaces process.env.EXPO_PUBLIC_* at build time.
// This declaration satisfies TypeScript's strict mode without pulling in all of @types/node.
declare const process: {
  env: Record<string, string | undefined>;
};

// Metro resolves image imports to a numeric asset ID at runtime; without this,
// TypeScript has no idea what `import x from './foo.png'` even is.
declare module '*.png' {
  const value: import('react-native').ImageSourcePropType;
  export default value;
}
