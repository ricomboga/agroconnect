// Tab 2: Wait briefly then POST a reply to trigger the new_reply WS event
const THREAD_ID = process.argv[2];
if (!THREAD_ID) { console.error('Usage: node ws-tab2-post-reply.mjs <threadId>'); process.exit(1); }

// Give Tab 1 time to connect and join the room
await new Promise(r => setTimeout(r, 2000));

console.log(`[Tab2] POSTing reply to thread ${THREAD_ID}...`);

const res = await fetch(`http://localhost:3005/api/v1/community/threads/${THREAD_ID}/replies`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // In dev mode, JWT auth is required. We bypass by using a fake token.
    // The dev server uses a real JWT_PUBLIC_KEY, so we need a valid token or
    // we can temporarily test with the auth middleware checking for JWT.
    // For this manual test we'll send without auth to see the 401 + WS separately.
  },
  body: JSON.stringify({ body: 'This is the WebSocket test reply, sent from Tab 2.' }),
});

const body = await res.json();
console.log(`[Tab2] Response status: ${res.status}`);
console.log('[Tab2] Response body:', JSON.stringify(body, null, 2));
