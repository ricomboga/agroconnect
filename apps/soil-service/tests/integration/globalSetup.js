'use strict';

const { execSync } = require('child_process');
const path = require('path');

const PG_USER = 'agroconnect';
const PG_PASSWORD = 'agroconnect_dev';
const PG_HOST = 'localhost';
const PG_PORT = '5434';
const TEST_DB = 'soil_test_db';
const TEST_DB_URL = `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${TEST_DB}`;

const REPO_ROOT = path.join(__dirname, '..', '..', '..', '..');
const COMPOSE_FILE = path.join(REPO_ROOT, 'infra', 'docker-compose.test.yml');
const SCHEMA_PATH = path.join(
  REPO_ROOT,
  'packages',
  'db',
  'prisma',
  'soil',
  'schema.prisma',
);

module.exports = async function globalSetup() {
  try {
    execSync(`docker compose -f "${COMPOSE_FILE}" up -d --wait`, {
      stdio: 'pipe',
      timeout: 90_000,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[globalSetup] Warning: could not start test DB container (${msg}). ` +
        'Integration tests will be skipped or fail — run docker-compose.test.yml first.',
    );
  }

  // Create soil_test_db if it doesn't exist (compose file only seeds farm_test_db)
  try {
    execSync(
      `docker compose -f "${COMPOSE_FILE}" exec -T postgres-test psql -U ${PG_USER} -c "CREATE DATABASE ${TEST_DB};"`,
      { stdio: 'pipe', timeout: 10_000, shell: true },
    );
  } catch {
    // DB may already exist or container is down — ignore
  }

  process.env['SOIL_DATABASE_URL'] = TEST_DB_URL;

  const prismaBin = path.join(REPO_ROOT, 'packages', 'db', 'node_modules', '.bin', 'prisma');

  try {
    execSync(
      `"${prismaBin}" db push --schema="${SCHEMA_PATH}" --force-reset --accept-data-loss`,
      {
        cwd: REPO_ROOT,
        stdio: 'pipe',
        timeout: 60_000,
        env: { ...process.env, SOIL_DATABASE_URL: TEST_DB_URL },
        shell: true,
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[globalSetup] Warning: could not push soil schema to test DB (${msg}). ` +
        'Integration tests will fail — ensure the test DB is running at ${TEST_DB_URL}.',
    );
    // Set a flag so integration tests can detect the missing DB
    process.env['SOIL_TEST_DB_UNAVAILABLE'] = '1';
  }
};
