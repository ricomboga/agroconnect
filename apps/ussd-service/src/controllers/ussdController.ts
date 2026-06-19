import type { Request, Response } from 'express';
import { routeUSSD } from '../router/menuRouter.js';
import { upsertSession, deleteSession } from '../session/sessionManager.js';
import { RESPONSES } from '../menus/responses.js';
import { ussdRequestSchema } from '../schemas/ussd.schema.js';
import { logger } from '../logger.js';

export async function handleUssd(req: Request, res: Response): Promise<void> {
  const parsed = ussdRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    logger.warn({ errors: parsed.error.flatten() }, 'Invalid USSD request body');
    res.status(200).type('text/plain').send(RESPONSES.GENERIC_ERROR);
    return;
  }

  const { sessionId, phoneNumber, text } = parsed.data;

  logger.info({ sessionId, phoneNumber, text }, 'USSD request received');

  const { response, menuState, isEnd } = routeUSSD(text);

  if (isEnd) {
    await deleteSession(sessionId);
  } else {
    await upsertSession(sessionId, phoneNumber, menuState);
  }

  logger.info({ sessionId, menuState, isEnd, responseLength: response.length }, 'USSD response sent');

  res.status(200).type('text/plain').send(response);
}
