import crypto from 'node:crypto';

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
});

process.env['JWT_PRIVATE_KEY'] = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
process.env['JWT_PUBLIC_KEY'] = publicKey.export({ type: 'spki', format: 'pem' }) as string;
