/**
 * Manual WebSocket test — simulates two terminal tabs:
 *   Tab 1: connect WS, join thread room, wait for new_reply
 *   Tab 2: POST a reply via HTTP (with a valid dev JWT)
 *
 * Usage:
 *   COMMUNITY_DATABASE_URL=postgres://... node scripts/ws-demo.mjs
 *
 * The script generates a fresh RSA keypair, starts the service on a random
 * port, then runs both "tabs" concurrently.
 */

import crypto from 'node:crypto';
import http from 'node:http';
import { PrismaClient } from '../../../packages/db/generated/community-client/index.js';
import { io as socketClient } from 'socket.io-client';

// ─── 1. Generate RSA keypair and a signed JWT ──────────────────────────────
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
process.env.JWT_PUBLIC_KEY = pubPem;
process.env.NODE_ENV = 'test'; // prevent automatic server.listen in index.ts
process.env.LOG_LEVEL = 'silent';
process.env.KAFKA_BROKERS = 'localhost:9094';

function makeJwt(userId, role) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, role, iat: Math.floor(Date.now() / 1000) }),
  ).toString('base64url');
  const sig = crypto
    .createSign('RSA-SHA256')
    .update(`${header}.${payload}`)
    .sign(privateKey)
    .toString('base64url');
  return `${header}.${payload}.${sig}`;
}

const jwt = makeJwt('ws-test-user', 'farmer');

// ─── 2. Seed a thread in the DB ────────────────────────────────────────────
const dbUrl = process.env.COMMUNITY_DATABASE_URL;
if (!dbUrl) {
  console.error('COMMUNITY_DATABASE_URL not set');
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
const thread = await prisma.thread.create({
  data: {
    authorId: 'ws-test-user',
    category: 'crop_advice',
    title: 'WS Demo Thread',
    body: 'This thread was created for the WebSocket demo test.',
    status: 'active',
  },
});
const THREAD_ID = thread.id;
console.log(`\n[Seed]  Created thread: ${THREAD_ID}`);

// ─── 3. Start the HTTP + Socket.IO server ──────────────────────────────────
const { app, httpServer } = await import('../src/index.js');
const { initIo } = await import('../src/socket.js');
initIo(httpServer);

await new Promise((resolve) => httpServer.listen(0, resolve));
const PORT = httpServer.address().port;
console.log(`[Server] Listening on port ${PORT}`);

// ─── 4. Tab 1: connect WS client and join thread room ─────────────────────
const socket = socketClient(`http://localhost:${PORT}`, { transports: ['websocket'] });

await new Promise((resolve, reject) => {
  socket.on('connect', () => {
    console.log(`\n[Tab 1] Connected to ws://localhost:${PORT} (id=${socket.id})`);
    socket.emit('join_room', { threadId: THREAD_ID });
    console.log(`[Tab 1] Emitted join_room for thread:${THREAD_ID}`);
    console.log('[Tab 1] Waiting for new_reply event...');
    resolve();
  });
  socket.on('connect_error', reject);
  setTimeout(() => reject(new Error('WS connection timeout')), 5000);
});

// ─── 5. Tab 2: POST a reply (triggers new_reply emission) ─────────────────
const newReplyPromise = new Promise((resolve) => socket.once('new_reply', resolve));

await new Promise((resolve) => setTimeout(resolve, 300)); // brief yield

console.log(`\n[Tab 2] POST /api/v1/community/threads/${THREAD_ID}/replies`);
const res = await fetch(
  `http://localhost:${PORT}/api/v1/community/threads/${THREAD_ID}/replies`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ body: 'Maize does best when planted in March before long rains.' }),
  },
);
const resBody = await res.json();
console.log(`[Tab 2] Response: HTTP ${res.status}`);
console.log('[Tab 2]', JSON.stringify(resBody.data ?? resBody, null, 2));

// ─── 6. Tab 1 receives the event ──────────────────────────────────────────
const reply = await Promise.race([
  newReplyPromise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('WS event timeout')), 5000)),
]);

console.log('\n[Tab 1] >>> Received new_reply event:');
console.log(JSON.stringify(reply, null, 2));
console.log('\n[PASS] WebSocket emission confirmed.');

// ─── Cleanup ───────────────────────────────────────────────────────────────
socket.disconnect();
await new Promise((r) => httpServer.close(r));
await prisma.thread.deleteMany({ where: { id: THREAD_ID } });
await prisma.$disconnect();
process.exit(0);
