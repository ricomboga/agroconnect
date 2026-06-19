/** @type {import('jest').Config} */

const moduleNameMapper = {
  '^(\\.{1,2}/.*)\\.js$': '$1',
  '^@agroconnect/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  '^@agroconnect/db/soil$': '<rootDir>/../../packages/db/src/soil.ts',
};

const transform = {
  '^.+\\.ts$': [
    'ts-jest',
    {
      diagnostics: { ignoreCodes: [2307, 6059] },
      tsconfig: {
        module: 'CommonJS',
        moduleResolution: 'Node',
        declaration: false,
        declarationMap: false,
        strict: true,
      },
    },
  ],
};

module.exports = {
  globalSetup: '<rootDir>/tests/integration/globalSetup.js',
  globalTeardown: '<rootDir>/tests/integration/globalTeardown.js',
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      setupFiles: ['<rootDir>/tests/setup.ts'],
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      moduleNameMapper,
      transform,
    },
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      setupFiles: ['<rootDir>/tests/integration/setup.ts'],
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      moduleNameMapper,
      transform,
    },
  ],
};
