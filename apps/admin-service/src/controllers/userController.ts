import type { Response, NextFunction } from 'express';
import type { AdminRequest } from '../types/index.js';
import * as userService from '../services/userService.js';
import type { Requester } from '../services/userService.js';
import type { ListUsersQuery } from '../schemas/listUsersQuery.schema.js';
import type { UpdateUserStatusDto } from '../schemas/updateUserStatus.schema.js';
import type { CreateUserDto } from '../schemas/createUser.schema.js';

function requesterFrom(req: AdminRequest): Requester {
  return {
    actor: req.user.id,
    isSuperAdmin: req.user.isSuperAdmin,
    staffRole: req.user.staffRole,
    county: req.user.county,
  };
}

export const listUsers = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = req.query as unknown as ListUsersQuery;
    const result = await userService.listUsers(query, requesterFrom(req));
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dto = req.body as CreateUserDto;
    const user = await userService.createUser(dto, requesterFrom(req));
    res.status(201).json({ data: user });
  } catch (err) {
    next(err);
  }
};

export const setUserStatus = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { is_active } = req.body as UpdateUserStatusDto;
    await userService.setUserStatus(id, is_active, requesterFrom(req));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const verifyUser = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    await userService.verifyUser(id, requesterFrom(req));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
