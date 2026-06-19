import admin from 'firebase-admin';
import { logger } from '../logger.js';

let initialised = false;

function ensureInitialised(): void {
  if (initialised) return;
  const serviceAccountJson = process.env['FCM_SERVICE_ACCOUNT'];
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount;
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    // Falls back to GOOGLE_APPLICATION_CREDENTIALS env var (path to JSON file)
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  }
  initialised = true;
}

export async function sendPush(
  token: string,
  title: string,
  body: string,
): Promise<'sent' | 'failed'> {
  try {
    ensureInitialised();
    await admin.messaging().send({ token, notification: { title, body } });
    return 'sent';
  } catch (err) {
    logger.error({ err, context: 'fcmService' }, 'FCM send failed');
    return 'failed';
  }
}
