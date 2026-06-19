// Expo's Babel transform replaces process.env.EXPO_PUBLIC_* at build time.
// This declaration satisfies TypeScript's strict mode without pulling in all of @types/node.
declare const process: {
  env: Record<string, string | undefined>;
};
