import { PrismaClient } from '../../../packages/db/generated/community-client/index.js';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.COMMUNITY_DATABASE_URL } },
});

const thread = await prisma.thread.create({
  data: {
    authorId: 'ws-test-user',
    category: 'crop_advice',
    title: 'WS test thread',
    body: 'Testing WebSocket emission on reply creation.',
    status: 'active',
  },
});

console.log(thread.id);
await prisma.$disconnect();
