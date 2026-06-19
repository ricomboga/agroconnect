'use strict';

const { execSync } = require('child_process');
const path = require('path');

const TEST_DB_URL =
  'postgresql://agroconnect:agroconnect_dev@localhost:5434/community_test_db';

const REPO_ROOT = path.join(__dirname, '..', '..', '..', '..');
const COMPOSE_FILE = path.join(REPO_ROOT, 'infra', 'docker-compose.test.yml');
const SCHEMA_PATH = path.join(
  REPO_ROOT,
  'packages',
  'db',
  'prisma',
  'community',
  'schema.prisma',
);

module.exports = async function globalSetup() {
  // Start isolated test postgres container
  try {
    execSync(`docker compose -f "${COMPOSE_FILE}" up -d --wait`, {
      stdio: 'pipe',
      timeout: 90_000,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[globalSetup] Warning: could not start test DB container (${msg}). ` +
        'Ensure infra/docker-compose.test.yml is running before integration tests.',
    );
  }

  // Create community_test_db if it doesn't exist
  try {
    execSync(
      `docker exec agroconnect-postgres-test psql -U agroconnect -c "CREATE DATABASE community_test_db"`,
      { stdio: 'pipe', timeout: 15_000 },
    );
  } catch {
    // DB may already exist — ignore
  }

  process.env['COMMUNITY_DATABASE_URL'] = TEST_DB_URL;

  const prismaBin = path.join(REPO_ROOT, 'packages', 'db', 'node_modules', '.bin', 'prisma');

  try {
    execSync(
      `"${prismaBin}" db push --schema="${SCHEMA_PATH}" --force-reset --accept-data-loss`,
      {
        cwd: REPO_ROOT,
        stdio: 'pipe',
        timeout: 60_000,
        env: { ...process.env, COMMUNITY_DATABASE_URL: TEST_DB_URL },
        shell: true,
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[globalSetup] Warning: could not push community schema to test DB (${msg}). ` +
        'Integration tests will be skipped — ensure the test DB is running.',
    );
    process.env['COMMUNITY_TEST_DB_UNAVAILABLE'] = '1';
  }
};
