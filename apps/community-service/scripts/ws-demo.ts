/**
 * Manual WebSocket test — simulates two terminal tabs:
 *   Tab 1: connect WS, join thread room, wait for new_reply
 *   Tab 2: POST a reply via HTTP (with a valid dev JWT)
 *
 * Run: COMMUNITY_DATABASE_URL=postgres://... npx tsx scripts/ws-demo.ts
 */

import crypto from 'node:crypto';
import http from 'node:http';
import { PrismaClient } from '../../../packages/db/generated/community-client/index.js';
import { io as socketClient } from 'socket.io-client';
import { app } from '../src/index.js';
import { initIo } from '../src/socket.js';

async function main(): Promise<void> {
  // ─── 1. Generate RSA keypair + JWT ──────────────────────────────────────
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  process.env['JWT_PUBLIC_KEY'] = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  process.env['NODE_ENV'] = 'test';
  process.env['LOG_LEVEL'] = 'silent';
  process.env['KAFKA_BROKERS'] = 'localhost:9094';

  function makeJwt(userId: string, role: string): string {
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

  // ─── 2. Seed a thread ───────────────────────────────────────────────────
  const dbUrl = process.env['COMMUNITY_DATABASE_URL'];
  if (!dbUrl) { console.error('COMMUNITY_DATABASE_URL not set'); process.exit(1); }

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

  // ─── 3. Start server ────────────────────────────────────────────────────
  const httpServer = http.createServer(app);
  initIo(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const addr = httpServer.address() as { port: number };
  const PORT = addr.port;
  console.log(`[Server] Listening on port ${PORT} (Socket.IO attached)`);

  // ─── 4. Tab 1: WS connect + join_room ───────────────────────────────────
  const socket = socketClient(`http://localhost:${PORT}`, { transports: ['websocket'] });

  await new Promise<void>((resolve, reject) => {
    socket.on('connect', () => {
      console.log(`\n[Tab 1] Connected  ws://localhost:${PORT}  id=${socket.id}`);
      socket.emit('join_room', { threadId: THREAD_ID });
      console.log(`[Tab 1] Emitted join_room  room=thread:${THREAD_ID}`);
      console.log('[Tab 1] Waiting for new_reply ...');
      resolve();
    });
    socket.on('connect_error', reject);
    setTimeout(() => reject(new Error('WS connection timeout')), 5000);
  });

  // ─── 5. Tab 2: POST reply ────────────────────────────────────────────────
  const newReplyPromise = new Promise<unknown>((resolve) => socket.once('new_reply', resolve));
  await new Promise<void>((r) => setTimeout(r, 300));

  console.log(`\n[Tab 2] POST /api/v1/community/threads/${THREAD_ID}/replies`);
  const res = await fetch(
    `http://localhost:${PORT}/api/v1/community/threads/${THREAD_ID}/replies`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ body: 'Maize does best when planted in March before long rains.' }),
    },
  );
  const resBody = await res.json() as { data?: unknown };
  console.log(`[Tab 2] HTTP ${res.status}`);
  console.log('[Tab 2]', JSON.stringify(resBody.data ?? resBody, null, 2));

  // ─── 6. Tab 1 receives event ─────────────────────────────────────────────
  const reply = await Promise.race([
    newReplyPromise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('WS new_reply event not received within 5s')), 5000),
    ),
  ]);

  console.log('\n[Tab 1] >>> Received new_reply event:');
  console.log(JSON.stringify(reply, null, 2));
  console.log('\n[PASS]  WebSocket new_reply emission confirmed.\n');

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  socket.disconnect();
  await new Promise<void>((r) => httpServer.close(r));
  await prisma.thread.deleteMany({ where: { id: THREAD_ID } });
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('\n[FAIL]', err.message);
  process.exit(1);
});
