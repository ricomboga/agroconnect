const { execSync } = require('child_process');

module.exports = async function globalSetup() {
  process.env['MARKET_DATABASE_URL'] = 'postgresql://postgres:password@localhost:5432/market_test';
  try {
    execSync('pnpm --filter @agroconnect/db migrate:market', {
      env: { ...process.env, MARKET_DATABASE_URL: process.env['MARKET_DATABASE_URL'] },
      stdio: 'pipe',
    });
    process.env['MARKET_DB_AVAILABLE'] = 'true';
  } catch (err) {
    // DB not available — unit tests can still run; integration tests will be skipped
    console.warn('[globalSetup] DB migration failed — integration tests will be skipped');
    process.env['MARKET_DB_AVAILABLE'] = 'false';
  }
};
