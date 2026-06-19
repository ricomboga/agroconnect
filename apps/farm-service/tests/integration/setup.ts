import crypto from 'node:crypto';

// DATABASE_URL is set by globalSetup and inherited by workers; re-set here
// as a safety net for running integration tests in isolation.
process.env['DATABASE_URL'] ??=
  'postgresql://agroconnect:agroconnect_dev@localhost:5434/farm_test_db';

// Use port 0 so each worker binds to a random available port instead of 3001,
// preventing conflicts between parallel Jest workers.
process.env['PORT'] = '0';

const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
process.env['JWT_PUBLIC_KEY'] = publicKey.export({ type: 'spki', format: 'pem' }) as string;
process.env['KAFKA_BROKERS'] = 'localhost:9094';
process.env['MEDIA_SERVICE_URL'] = 'http://localhost:3010';
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'silent';
