// Tab 1: Connect to WebSocket, join thread room, listen for new_reply
import { io } from 'socket.io-client';

const THREAD_ID = process.argv[2];
if (!THREAD_ID) { console.error('Usage: node ws-tab1-listen.mjs <threadId>'); process.exit(1); }

const socket = io('http://localhost:3005', { transports: ['websocket'] });

socket.on('connect', () => {
  console.log(`[Tab1] Connected (id=${socket.id}). Joining room thread:${THREAD_ID}`);
  socket.emit('join_room', { threadId: THREAD_ID });
  console.log('[Tab1] Waiting for new_reply event...');
});

socket.on('new_reply', (reply) => {
  console.log('[Tab1] >>> Received new_reply event:');
  console.log(JSON.stringify(reply, null, 2));
  socket.disconnect();
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.error('[Tab1] Connection error:', err.message);
  process.exit(1);
});

// Timeout if no event received in 30s
setTimeout(() => {
  console.error('[Tab1] Timed out — no new_reply event received within 30s');
  process.exit(1);
}, 30_000);
