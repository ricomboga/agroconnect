import { useEffect, useRef } from 'react';
import type { Reply } from '../api/community';

declare global {
  interface Window {
    __simulateReply__?: (reply: Reply) => void;
  }
}

const WS_BASE =
  (process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1')
    .replace('https://', 'wss://')
    .replace('http://', 'ws://')
    .replace('/api/v1', '');

export function useCommunitySocket(
  threadId: string,
  onNewReply: (reply: Reply) => void,
): void {
  const callbackRef = useRef(onNewReply);
  useEffect(() => { callbackRef.current = onNewReply; });

  useEffect(() => {
    // Expose simulator for Playwright / dev testing before attempting real connection
    window.__simulateReply__ = (reply: Reply) => callbackRef.current(reply);

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`${WS_BASE}/ws/community/threads/${threadId}`);

      ws.onmessage = (evt: MessageEvent<string>) => {
        try {
          const msg = JSON.parse(evt.data) as { type: string; reply: Reply };
          if (msg.type === 'new_reply' && msg.reply) {
            callbackRef.current(msg.reply);
          }
        } catch {
          // ignore malformed frame
        }
      };

      // Silent failure — app works without real-time
      ws.onerror = () => { /* no-op */ };
    } catch {
      // WebSocket unavailable (SSR or restricted env)
    }

    return () => {
      ws?.close();
      delete window.__simulateReply__;
    };
  }, [threadId]);
}
