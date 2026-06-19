import crypto from 'node:crypto';

const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

process.env['JWT_PUBLIC_KEY'] = publicKey.export({ type: 'spki', format: 'pem' }) as string;
process.env['KAFKA_BROKERS'] = 'localhost:9094';
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'silent';
