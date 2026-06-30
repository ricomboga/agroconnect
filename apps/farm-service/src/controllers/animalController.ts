import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as farmRepo from '../repositories/farmRepository.js';
import { createError } from '../middleware/errorHandler.js';

export async function addAnimal(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const farm = await farmRepo.findFarmById(
      req.params['farmId'] as string,
      req.user.role === 'admin' ? undefined : req.user.id,
    );
    if (!farm) throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
    const group = await farmRepo.createAnimalGroup(farm.id, req.body);
    res.status(201).json({ data: group });
  } catch (err) {
    next(err);
  }
}

export async function listAnimals(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const farm = await farmRepo.findFarmById(
      req.params['farmId'] as string,
      req.user.role === 'admin' ? undefined : req.user.id,
    );
    if (!farm) throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.farm.not_found');
    const animals = await farmRepo.listAnimalGroups(farm.id);
    res.json({ data: animals });
  } catch (err) {
    next(err);
  }
}
