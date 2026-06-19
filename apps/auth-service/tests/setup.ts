import crypto from 'node:crypto';

// Generate a 2048-bit RSA key pair for tests (4096 is too slow per-run)
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
});

process.env['JWT_PRIVATE_KEY'] = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
process.env['JWT_PUBLIC_KEY'] = publicKey.export({ type: 'spki', format: 'pem' }) as string;
process.env['JWT_ACCESS_TTL'] = '900';
process.env['JWT_REFRESH_TTL'] = '2592000';
process.env['BCRYPT_ROUNDS'] = '1'; // bcrypt with 12 rounds = 1 s/hash — too slow for unit tests
process.env['OTP_TTL_SECONDS'] = '300';
process.env['OTP_RATE_LIMIT_MAX'] = '3';
process.env['OTP_TEST_BYPASS'] = '999000'; // non-empty: skips AT SMS call in tests
process.env['REDIS_URL'] = 'redis://localhost:6379';
process.env['KAFKA_BROKERS'] = 'localhost:9094';
process.env['AT_API_KEY'] = 'test_key';
process.env['AT_USERNAME'] = 'sandbox';
process.env['NODE_ENV'] = 'test';
