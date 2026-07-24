/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['./tests/setup.ts'],
  testMatch: ['**/tests/unit/**/*.test.ts'],
  moduleNameMapper: {
    // strip .js extensions so Jest resolves .ts files
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@agroconnect/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@agroconnect/kafka$': '<rootDir>/../../packages/kafka/src/index.ts',
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
      },
    }],
  },
};
