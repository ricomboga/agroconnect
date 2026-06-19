/** @type {import('jest').Config} */

const moduleNameMapper = {
  '^(\\.{1,2}/.*)\\.js$': '$1',
  '^@agroconnect/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  '^@agroconnect/db/finance$': '<rootDir>/../../packages/db/src/finance.ts',
  '^@agroconnect/kafka$': '<rootDir>/../../packages/kafka/src/index.ts',
};

const transform = {
  '^.+\\.ts$': [
    'ts-jest',
    {
      diagnostics: { ignoreCodes: [2307] },
      tsconfig: '<rootDir>/tests/tsconfig.json',
    },
  ],
};

module.exports = {
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
  ],
};
