import { MongoClient, Db } from 'mongodb';
import { config } from './config.js';
import { logger } from './logger.js';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDb(): Promise<Db> {
  if (db) return db;
  client = new MongoClient(config.mongodbUri);
  await client.connect();
  db = client.db();
  logger.info({ uri: config.mongodbUri }, 'MongoDB connected');
  return db;
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

export function getDb(): Db {
  if (!db) throw new Error('MongoDB not connected — call connectDb() first');
  return db;
}
