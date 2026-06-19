import crypto from 'node:crypto';

const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

process.env['JWT_PUBLIC_KEY'] = publicKey.export({ type: 'spki', format: 'pem' }) as string;
process.env['INTERNAL_SERVICE_SECRET'] = 'test-service-secret';
process.env['AUTH_SERVICE_URL'] = 'http://localhost:3008';
process.env['COMMUNITY_SERVICE_URL'] = 'http://localhost:3005';
process.env['FARM_SERVICE_URL'] = 'http://localhost:3001';
process.env['FINANCE_SERVICE_URL'] = 'http://localhost:3003';
process.env['MARKET_SERVICE_URL'] = 'http://localhost:3004';
process.env['NODE_ENV'] = 'test';
