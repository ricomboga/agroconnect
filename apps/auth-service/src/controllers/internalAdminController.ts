import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as adminUserService from '../services/adminUserService.js';

const createUserSchema = z.object({
  phone: z.string().min(1),
  email: z.string().email().optional(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  role: z.enum(['farmer', 'extension_officer', 'vet_officer', 'supplier', 'buyer', 'govt_officer', 'admin', 'lender']),
  county: z.string().optional(),
  language: z.enum(['sw', 'en']).optional(),
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
