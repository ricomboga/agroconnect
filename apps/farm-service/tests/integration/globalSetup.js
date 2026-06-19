'use strict';

const { execSync } = require('child_process');
const path = require('path');

const TEST_DB_URL =
  'postgresql://agroconnect:agroconnect_dev@localhost:5434/farm_test_db';

const REPO_ROOT = path.join(__dirname, '..', '..', '..', '..');
const COMPOSE_FILE = path.join(REPO_ROOT, 'infra', 'docker-compose.test.yml');
const SCHEMA_PATH = path.join(
  REPO_ROOT,
  'packages',
  'db',
  'prisma',
  'farm',
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

  // Propagate DATABASE_URL to worker processes (workers fork after globalSetup)
  process.env['DATABASE_URL'] = TEST_DB_URL;

  // Resolve prisma binary — pnpm hoists it under packages/db/node_modules/.bin
  const prismaBin = path.join(REPO_ROOT, 'packages', 'db', 'node_modules', '.bin', 'prisma');

  // Push Prisma schema to test DB (reset tables each full run)
  try {
    execSync(
      `"${prismaBin}" db push --schema="${SCHEMA_PATH}" --force-reset --accept-data-loss`,
      {
        cwd: REPO_ROOT,
        stdio: 'pipe',
        timeout: 60_000,
        env: { ...process.env, DATABASE_URL: TEST_DB_URL },
        shell: true,
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[globalSetup] Warning: could not push farm schema to test DB (${msg}). ` +
        'Integration tests will be skipped — ensure the test DB is running.',
    );
    process.env['FARM_TEST_DB_UNAVAILABLE'] = '1';
  }
};
