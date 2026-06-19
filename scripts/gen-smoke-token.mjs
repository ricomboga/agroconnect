/**
 * Generates an RSA key pair and a signed JWT for local smoke testing.
 * Outputs shell exports that can be eval'd:
 *   export JWT_PUBLIC_KEY="..."
 *   export SMOKE_TOKEN="..."
 */
import crypto from 'node:crypto';

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
const payload = Buffer.from(JSON.stringify({
  sub:   'smoke-farmer-001',
  role:  'farmer',
  phone: '+254712345678',
  iat:   Math.floor(Date.now() / 1000),
  exp:   Math.floor(Date.now() / 1000) + 900,
})).toString('base64url');

const signer = crypto.createSign('RSA-SHA256');
signer.update(`${header}.${payload}`);
const sig = signer.sign(privateKey, 'base64url');
const token = `${header}.${payload}.${sig}`;

// Single-line PEM (newlines as \n) for env var
const pubPem = publicKey.export({ type: 'spki', format: 'pem' })
  .toString()
  .replace(/\n/g, '\\n');

console.log(`JWT_PUBLIC_KEY=${pubPem}`);
console.log(`SMOKE_TOKEN=${token}`);
