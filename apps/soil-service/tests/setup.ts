import crypto from 'node:crypto';

const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

process.env['JWT_PUBLIC_KEY'] = publicKey.export({ type: 'spki', format: 'pem' }) as string;
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'silent';
process.env['MARKET_SERVICE_URL'] = 'http://localhost:9999';
