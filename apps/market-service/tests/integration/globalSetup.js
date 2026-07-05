const { execSync } = require('child_process');
const path = require('path');

// Shares the same postgres-test container as govt-service's integration tests
// (infra/docker-compose.test.yml, agroconnect/agroconnect_dev@localhost:5434) —
// this used to point at a standalone postgres:password@5432 that no compose
// file in this repo actually provisions, so integration tests silently skipped.
const REPO_ROOT = path.join(__dirname, '..', '..', '..', '..');
const COMPOSE_FILE = path.join(REPO_ROOT, 'infra', 'docker-compose.test.yml');

module.exports = async function globalSetup() {
  process.env['MARKET_DATABASE_URL'] = 'postgresql://agroconnect:agroconnect_dev@localhost:5434/market_test';

  try {
    execSync(`docker compose -f "${COMPOSE_FILE}" up -d --wait`, {
      stdio: 'pipe',
      timeout: 90_000,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[globalSetup] Warning: could not start test DB container (${msg}).`);
  }

  try {
    execSync(
      `docker exec agroconnect-postgres-test psql -U agroconnect -d farm_test_db -c "CREATE DATABASE market_test;"`,
      { stdio: 'pipe', timeout: 15_000 },
    );
  } catch {
    // Database already exists from a previous run — fine, migrate:market will just apply on top.
  }

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
