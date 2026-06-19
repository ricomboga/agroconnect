/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['./tests/setup.ts'],
  testMatch: ['**/tests/unit/**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
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
