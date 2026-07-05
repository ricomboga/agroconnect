import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import { upsertFarmerLenderAssignment } from '../repositories/farmerLenderAssignmentRepository.js';
import type { AssignLenderDto } from '../schemas/assignLender.schema.js';

export async function assignLender(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as { id: string };
    const { lenderId } = req.body as AssignLenderDto;
    const assignment = await upsertFarmerLenderAssignment(id, lenderId);
    res.json({ data: assignment });
  } catch (err) {
    next(err);
  }
}
