import type { RequestHandler } from 'express';
import * as farmsService from '../services/farmsService.js';
import type { ListFarmsQuery } from '../schemas/listFarmsQuery.schema.js';

export const listFarms: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const query = req.query as unknown as ListFarmsQuery;
    const token = (req.headers['authorization'] ?? '').replace(/^Bearer\s+/i, '');
    const result = await farmsService.listFarms(query, token);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
