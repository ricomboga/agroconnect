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
    '^@agroconnect/db/auth$': '<rootDir>/../../packages/db/src/auth.ts',
    '^@agroconnect/kafka$': '<rootDir>/../../packages/kafka/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        module: 'CommonJS',
        moduleResolution: 'Node',
        declaration: false,
        declarationMap: false,
        strict: true,
      },
    }],
  },
};
