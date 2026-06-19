module.exports = async function globalTeardown() {
  if (process.env['MARKET_DB_AVAILABLE'] !== 'true') return;

  // Only reached when DB is available; pg must be installed in that case
  const { Client } = require('pg');
  const client = new Client({
    connectionString: 'postgresql://postgres:password@localhost:5432/postgres',
  });
  try {
    await client.connect();
    await client.query('DROP DATABASE IF EXISTS market_test WITH (FORCE)');
    await client.end();
  } catch {
    // best-effort cleanup
  }
};
