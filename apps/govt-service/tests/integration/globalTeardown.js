'use strict';

const { execSync } = require('child_process');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..', '..', '..');
const COMPOSE_FILE = path.join(REPO_ROOT, 'infra', 'docker-compose.test.yml');

module.exports = async function globalTeardown() {
  try {
    execSync(`docker compose -f "${COMPOSE_FILE}" down`, {
      stdio: 'pipe',
      timeout: 30_000,
    });
  } catch {
    // Ignore teardown errors — container may already be stopped
  }
};
