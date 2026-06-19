import AfricasTalking from 'africastalking';
import { logger } from '../logger.js';

const at = AfricasTalking({
  apiKey: process.env['AT_API_KEY'] ?? '',
  username: process.env['AT_USERNAME'] ?? '',
});

const sms = at.SMS;

export async function sendSms(phone: string, message: string): Promise<'sent' | 'failed'> {
  try {
    await sms.send({ to: [phone], message });
    return 'sent';
  } catch (err) {
    logger.error({ err, phone, context: 'smsService' }, 'SMS send failed');
    return 'failed';
  }
}
