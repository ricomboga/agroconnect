import { PushTemplate, swPushTemplates } from './sw/push.js';
import { swSmsTemplates } from './sw/sms.js';
import { enPushTemplates } from './en/push.js';
import { enSmsTemplates } from './en/sms.js';

export type { PushTemplate };

type TemplateData = Record<string, string>;

export function getPushTemplate(
  lang: string,
  topic: string,
  data: TemplateData,
): PushTemplate | null {
  const templates = lang === 'en' ? enPushTemplates : swPushTemplates;
  const factory = templates[topic];
  return factory ? factory(data) : null;
}

export function getSmsTemplate(lang: string, topic: string, data: TemplateData): string | null {
  const templates = lang === 'en' ? enSmsTemplates : swSmsTemplates;
  const factory = templates[topic];
  return factory ? factory(data) : null;
}
