import http from 'node:http';
import { Server } from 'socket.io';
import { logger } from './logger.js';

let _io: Server | null = null;

export function initIo(server: http.Server): Server {
  _io = new Server(server, {
    cors: { origin: '*' },
  });

  _io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'WebSocket client connected');

    socket.on('join_room', ({ threadId }: { threadId: string }) => {
      const room = `thread:${threadId}`;
      socket.join(room);
      logger.info({ socketId: socket.id, room }, 'Socket joined room');
    });

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'WebSocket client disconnected');
    });
  });

  return _io;
}

export function getIo(): Server | null {
  return _io;
}
