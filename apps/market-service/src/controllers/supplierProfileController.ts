import { Request, Response, NextFunction } from 'express';
import * as supplierProfileService from '../services/supplierProfileService.js';
import { parsePaginationParams, buildMeta } from '../utils/pagination.js';
import type { ListSupplierProfilesQuery } from '../schemas/listSupplierProfiles.query.schema.js';

export async function createSupplierProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const profile = await supplierProfileService.createOrUpdateSupplierProfile(req.body);
    res.status(201).json({ data: profile });
  } catch (err) {
    next(err);
  }
}

export async function getSupplierProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const profile = await supplierProfileService.getSupplierProfile(req.params['id'] as string);
    res.json({ data: profile });
  } catch (err) {
    next(err);
  }
}

export async function listSupplierProfiles(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as ListSupplierProfilesQuery;
    const pagination = parsePaginationParams(req.query as Record<string, unknown>);
    const { profiles, total, matchedOn } = await supplierProfileService.listSupplierProfiles(
      { county: query.county, subCounty: query.subCounty, category: query.category, userId: query.userId },
      pagination,
    );
    res.json({
      data: profiles,
      meta: { ...buildMeta(req.query as Record<string, unknown>, pagination, total), matched_on: matchedOn },
    });
  } catch (err) {
    next(err);
  }
}
