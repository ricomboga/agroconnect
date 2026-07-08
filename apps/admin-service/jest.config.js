/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['./tests/setup.ts'],
  testMatch: ['**/tests/unit/**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@agroconnect/shared/constants/counties$': '<rootDir>/../../packages/shared/src/constants/counties.ts',
    '^@agroconnect/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      diagnostics: { ignoreCodes: [2307, 6059] },
      tsconfig: {
        module: 'CommonJS',
        moduleResolution: 'Node',
        declaration: false,
        declarationMap: false,
        strict: true,
        baseUrl: '.',
        paths: {
          '@agroconnect/shared/constants/counties': ['../../packages/shared/src/constants/counties.ts'],
        },
      },
    }],
  },
};
