const { execSync } = require('child_process');

module.exports = async function globalTeardown() {
  if (process.env['MARKET_DB_AVAILABLE'] !== 'true') return;

  // Uses the postgres-test container directly (docker exec + psql) rather than the
  // `pg` npm package, which market-service never declared as a dependency.
  try {
    execSync(
      `docker exec agroconnect-postgres-test psql -U agroconnect -d farm_test_db -c "DROP DATABASE IF EXISTS market_test WITH (FORCE);"`,
      { stdio: 'pipe', timeout: 15_000 },
    );
  } catch {
    // best-effort cleanup
  }
};
