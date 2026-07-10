import { Request, Response, NextFunction } from 'express';
import * as officerProfileService from '../services/officerProfileService.js';

export async function listOfficerProfiles(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profiles = await officerProfileService.listOfficerProfiles();
    res.json({ data: profiles });
  } catch (err) {
    next(err);
  }
}

export async function getOfficerProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await officerProfileService.getOfficerProfile(req.params['id'] as string);
    res.json({ data: profile });
  } catch (err) {
    next(err);
  }
}

export async function createOfficerProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await officerProfileService.createOfficerProfile(req.body);
    res.status(201).json({ data: profile });
  } catch (err) {
    next(err);
  }
}

export async function updateOfficerProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await officerProfileService.updateOfficerProfile(req.params['id'] as string, req.body);
    res.json({ data: profile });
  } catch (err) {
    next(err);
  }
}

export async function getOfficerProfileByUserId(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await officerProfileService.getOfficerProfileByUserId(req.params['userId'] as string);
    res.json({ data: profile });
  } catch (err) {
    next(err);
  }
}
