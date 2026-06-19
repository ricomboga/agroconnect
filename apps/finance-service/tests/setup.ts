import crypto from 'node:crypto';

const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

process.env['JWT_PUBLIC_KEY'] = publicKey.export({ type: 'spki', format: 'pem' }) as string;
process.env['KAFKA_BROKERS'] = 'localhost:9094';
process.env['FARM_SERVICE_URL'] = 'http://localhost:3001';
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'silent';

// IP allowlist empty by default — individual tests set it when needed
process.env['SAFARICOM_IP_ALLOWLIST'] = '';

// HMAC secret empty by default — individual tests set it when needed
process.env['MPESA_CALLBACK_SECRET'] = '';

// M-Pesa Daraja credentials (sandbox)
process.env['MPESA_ENV'] = 'sandbox';
process.env['MPESA_CONSUMER_KEY'] = 'test-consumer-key';
process.env['MPESA_CONSUMER_SECRET'] = 'test-consumer-secret';
process.env['MPESA_SHORTCODE'] = '174379';
process.env['MPESA_PASSKEY'] = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
process.env['MPESA_CALLBACK_URL'] = 'https://example.com/api/v1/finance/mpesa/callback';
