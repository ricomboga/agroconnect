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
  language: z.enum(['sw', 'en']).optional(),
  isSuperAdmin: z.boolean().optional(),
  staffRole: z.enum(['admin', 'county_admin', 'moderator']).optional(),
});

export async function listUsersHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query['page_size'] ?? '20'), 10) || 20));

    const result = await adminUserService.listUsers({
      role: req.query['role'] as string | undefined,
      county: req.query['county'] as string | undefined,
      kyc_status: req.query['kyc_status'] as string | undefined,
      is_active:
        req.query['is_active'] !== undefined
          ? req.query['is_active'] === 'true'
          : undefined,
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
    const { is_active } = req.body as { is_active: boolean };
    await adminUserService.setUserStatus(id, is_active);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function verifyUserHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    await adminUserService.verifyUser(id);
    res.json({ success: true });
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

export async function batchGetUsersHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ids = String(req.query['ids'] ?? '').split(',').filter(Boolean);
    if (ids.length === 0) { res.json({ data: {} }); return; }
    const users = await findUsersByIds(ids);
    const map: Record<string, { fullName: string; phone: string }> = {};
    for (const u of users) {
      map[u.id] = { fullName: u.fullName, phone: u.phone };
    }
    res.json({ data: map });
  } catch (err) {
    next(err);
  }
}
