import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { KENYA_COUNTIES } from '@agroconnect/shared/constants/counties';
import * as adminUserService from '../services/adminUserService.js';
import * as kycService from '../services/kycService.js';
import { findUsersByIds } from '../repositories/userRepository.js';
import { createAuditLog, listAuditLogs, countAuditLogs } from '../repositories/auditLogRepository.js';

const createUserSchema = z.object({
  phone: z.string().min(1),
  email: z.string().email().optional(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  role: z.enum(['farmer', 'extension_officer', 'vet_officer', 'supplier', 'buyer', 'govt_officer', 'admin', 'lender', 'farm_worker']),
  county: z.enum(KENYA_COUNTIES).optional(),
  subCounty: z.string().max(100).optional(),
  language: z.enum(['sw', 'en']).optional(),
  isSuperAdmin: z.boolean().optional(),
  staffRole: z.enum(['admin', 'county_admin', 'moderator']).optional(),
  partnerBankId: z.string().optional(),
  supervisorId: z.string().optional(),
  createdByUserId: z.string().min(1),
});

const createSystemUserSchema = z.object({
  phone: z.string().min(1),
  email: z.string().email().optional(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  role: z.enum(['admin', 'govt_officer']),
  staffRole: z.enum(['admin', 'county_admin', 'moderator']),
  isSuperAdmin: z.boolean().optional(),
  county: z.enum(KENYA_COUNTIES).optional(),
  language: z.enum(['sw', 'en']).optional(),
  createdByUserId: z.string().min(1),
  roleIds: z.array(z.string()).optional(),
});

const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  county: z.enum(KENYA_COUNTIES).optional(),
  subCounty: z.string().max(100).optional(),
  partnerBankId: z.string().optional(),
  supervisorId: z.string().optional(),
});

const setUserStatusSchema = z.object({
  status: z.enum(['pending_verification', 'verified', 'active', 'inactive', 'disabled', 'deleted']),
});

const verifyUserSchema = z.object({
  verifierId: z.string().min(1),
});

const resetPinSchema = z.object({
  resetByUserId: z.string().min(1),
});

const assignRoleSchema = z.object({
  roleId: z.string().min(1),
  assignedByUserId: z.string().min(1),
});

const createRoleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const createPermissionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const attachPermissionSchema = z.object({
  permissionId: z.string().min(1),
});

export async function listUsersHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query['page_size'] ?? '20'), 10) || 20));

    const result = await adminUserService.listUsers({
      role: req.query['role'] as string | undefined,
      county: req.query['county'] as string | undefined,
      kyc_status: req.query['kyc_status'] as string | undefined,
      status: req.query['status'] as string | undefined,
      page,
      page_size: pageSize,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const data = await adminUserService.getUser(id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function setUserStatusHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const parsed = setUserStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    await adminUserService.setUserStatus(id, parsed.data.status);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function verifyUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const parsed = verifyUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    await adminUserService.verifyUser(id, parsed.data.verifierId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function resetPinHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const parsed = resetPinSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const { newPin } = await adminUserService.resetPin(id, parsed.data.resetByUserId);
    res.json({ data: { newPin } });
  } catch (err) {
    next(err);
  }
}

export async function getStatsHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await adminUserService.getStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

export async function createUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const user = await adminUserService.createUser(parsed.data);
    res.status(201).json({ data: user });
  } catch (err) {
    next(err);
  }
}

export async function createSystemUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createSystemUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const user = await adminUserService.createSystemUser(parsed.data);
    res.status(201).json({ data: user });
  } catch (err) {
    next(err);
  }
}

export async function updateUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const user = await adminUserService.updateUser(id, parsed.data);
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
}

export async function deleteUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    await adminUserService.deleteUser(id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

const assignExpertSchema = z.object({
  expertId: z.string().min(1),
});

export async function listExpertsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const county = req.query['county'] as string | undefined;
    const data = await adminUserService.listExperts(county);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function assignExpertHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const parsed = assignExpertSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const assignment = await adminUserService.assignExpert(id, parsed.data.expertId);
    res.json({ data: assignment });
  } catch (err) {
    next(err);
  }
}

const kycDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected', 'more_info']),
  reason: z.string().min(1),
  documentRequested: z.string().optional(),
  actor: z.string().min(1),
});

export async function kycQueueHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await kycService.listQueue({
      role: req.query['role'] as string | undefined,
      county: req.query['county'] as string | undefined,
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getKycHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const data = await kycService.getKyc(id);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function decideKycHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const parsed = kycDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const { actor, ...decisionParams } = parsed.data;
    const entry = await kycService.decide(id, { ...decisionParams, actor });
    res.json({ data: entry });
  } catch (err) {
    next(err);
  }
}

const createAuditLogSchema = z.object({
  actor: z.string().min(1),
  action: z.string().min(1),
  category: z.string().min(1),
  refId: z.string().optional(),
  note: z.string().optional(),
});

export async function createAuditLogHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createAuditLogSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const entry = await createAuditLog(parsed.data);
    res.status(201).json({ data: entry });
  } catch (err) {
    next(err);
  }
}

export async function listAuditLogsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query['page_size'] ?? '20'), 10) || 20));
    const [rows, total] = await Promise.all([
      listAuditLogs({ take: pageSize, skip: (page - 1) * pageSize }),
      countAuditLogs(),
    ]);
    res.json({ data: rows, meta: { total, page, page_size: pageSize } });
  } catch (err) {
    next(err);
  }
}

export async function listRolesHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roles = await adminUserService.listRoleDefs();
    res.json({ data: roles });
  } catch (err) {
    next(err);
  }
}

export async function createRoleHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const role = await adminUserService.createRoleDef(parsed.data.name, parsed.data.description);
    res.status(201).json({ data: role });
  } catch (err) {
    next(err);
  }
}

export async function listPermissionsHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const permissions = await adminUserService.listPermissionDefs();
    res.json({ data: permissions });
  } catch (err) {
    next(err);
  }
}

export async function createPermissionHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createPermissionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const permission = await adminUserService.createPermissionDef(parsed.data.name, parsed.data.description);
    res.status(201).json({ data: permission });
  } catch (err) {
    next(err);
  }
}

export async function attachPermissionToRoleHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const parsed = attachPermissionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    await adminUserService.grantPermissionToRole(id, parsed.data.permissionId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function detachPermissionFromRoleHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id, permissionId } = req.params as { id: string; permissionId: string };
    await adminUserService.revokePermissionFromRole(id, permissionId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function assignRoleToUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const parsed = assignRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    await adminUserService.assignRole(id, parsed.data.roleId, parsed.data.assignedByUserId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function unassignRoleFromUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id, roleId } = req.params as { id: string; roleId: string };
    await adminUserService.unassignRole(id, roleId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function getUserRolesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const roles = await adminUserService.getRolesForUser(id);
    const permissions = await adminUserService.getPermissionsForUser(id);
    res.json({ data: { roles, permissions } });
  } catch (err) {
    next(err);
  }
}

export async function batchGetUsersHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ids = String(req.query['ids'] ?? '').split(',').filter(Boolean);
    if (ids.length === 0) { res.json({ data: {} }); return; }
    const users = await findUsersByIds(ids);
    const map: Record<string, { fullName: string; phone: string; county: string | null; subCounty: string | null }> = {};
    for (const u of users) {
      map[u.id] = { fullName: u.fullName, phone: u.phone, county: u.county, subCounty: u.subCounty };
    }
    res.json({ data: map });
  } catch (err) {
    next(err);
  }
}
