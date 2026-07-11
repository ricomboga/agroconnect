import type { Response, NextFunction } from 'express';
import type { KenyaCounty } from '@agroconnect/shared/constants/counties';
import type { AdminRequest } from '../types/index.js';
import * as userService from '../services/userService.js';
import type { Requester } from '../services/userService.js';
import type { AccountStatus } from '../clients/authServiceClient.js';
import type { ListUsersQuery } from '../schemas/listUsersQuery.schema.js';
import type { UpdateUserStatusDto } from '../schemas/updateUserStatus.schema.js';
import type { CreateUserDto } from '../schemas/createUser.schema.js';
import type { CreateSystemUserDto } from '../schemas/createSystemUser.schema.js';
import type { AssignRoleDto, CreateRoleDto, CreatePermissionDto, AttachPermissionDto } from '../schemas/assignRole.schema.js';

function requesterFrom(req: AdminRequest): Requester {
  return {
    actor: req.user.id,
    isSuperAdmin: req.user.isSuperAdmin,
    staffRole: req.user.staffRole,
    // JWT county claim is only ever issued for accounts whose county was
    // already validated against KENYA_COUNTIES at creation time.
    county: req.user.county as KenyaCounty | undefined,
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
    const data = await userService.createUser(dto, requesterFrom(req));
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
};

export const createSystemUser = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dto = req.body as CreateSystemUserDto;
    const data = await userService.createSystemUser(dto, requesterFrom(req));
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
};

export const setUserStatus = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { status } = req.body as UpdateUserStatusDto;
    await userService.setUserStatus(id, status as AccountStatus, requesterFrom(req));
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

export const listRoles = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await userService.listRoles(requesterFrom(req));
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const createRole = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description } = req.body as CreateRoleDto;
    const data = await userService.createRole(name, description, requesterFrom(req));
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
};

export const listPermissions = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await userService.listPermissions(requesterFrom(req));
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const createPermission = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description } = req.body as CreatePermissionDto;
    const data = await userService.createPermission(name, description, requesterFrom(req));
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
};

export const attachPermissionToRole = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { permissionId } = req.body as AttachPermissionDto;
    await userService.attachPermissionToRole(id, permissionId, requesterFrom(req));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const assignRoleToUser = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { roleId } = req.body as AssignRoleDto;
    await userService.assignRoleToUser(id, roleId, requesterFrom(req));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const unassignRoleFromUser = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, roleId } = req.params as { id: string; roleId: string };
    await userService.unassignRoleFromUser(id, roleId, requesterFrom(req));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const getUserRoles = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const data = await userService.getUserRoles(id, requesterFrom(req));
    res.json({ data });
  } catch (err) {
    next(err);
  }
};
