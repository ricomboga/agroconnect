import type { Response, NextFunction, RequestHandler } from 'express';
import type { AdminRequest } from '../types/index.js';
import * as userService from '../services/userService.js';
import type { ListUsersQuery } from '../schemas/listUsersQuery.schema.js';
import type { UpdateUserStatusDto } from '../schemas/updateUserStatus.schema.js';

export const listUsers: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const query = req.query as unknown as ListUsersQuery;
    const result = await userService.listUsers(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const setUserStatus = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { is_active } = req.body as UpdateUserStatusDto;
    await userService.setUserStatus(id, is_active);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const verifyUser = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    await userService.verifyUser(id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
