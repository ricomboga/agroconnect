import type { Response, NextFunction } from 'express';
import type { AdminRequest } from '../types/index.js';
import * as reportsService from '../services/reportsService.js';
import { assertCapability } from '../middleware/staffAccess.js';
import { reportTypeParamSchema } from '../schemas/reportsQuery.schema.js';
import type { LivestockReportQuery } from '../schemas/reportsQuery.schema.js';

function countyScopeFor(req: AdminRequest): string | undefined {
  return req.user.staffRole === 'county_admin' && !req.user.isSuperAdmin ? req.user.county : undefined;
}

export const getFarmersByCounty = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    assertCapability(req.user, 'analytics');
    const data = await reportsService.getFarmersByCounty(countyScopeFor(req));
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const getLivestockStats = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    assertCapability(req.user, 'analytics');
    const { county, animalType } = req.query as unknown as LivestockReportQuery;
    const scope = countyScopeFor(req);
    const data = await reportsService.getLivestockStats({ county: scope ?? county, animalType });
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const getLoansByInstitution = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    assertCapability(req.user, 'analytics');
    const data = await reportsService.getLoansByInstitution();
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const getExpertDirectory = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    assertCapability(req.user, 'analytics');
    const { county } = req.query as unknown as LivestockReportQuery;
    const scope = countyScopeFor(req);
    const data = await reportsService.getExpertDirectory(scope ?? county);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const getSupplierDirectory = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    assertCapability(req.user, 'analytics');
    const { county } = req.query as unknown as LivestockReportQuery;
    const scope = countyScopeFor(req);
    const data = await reportsService.getSupplierDirectory(scope ?? county);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const getLenderDirectory = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    assertCapability(req.user, 'analytics');
    const data = await reportsService.getLenderDirectory();
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const getOfficerDirectory = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    assertCapability(req.user, 'analytics');
    const { county } = req.query as unknown as LivestockReportQuery;
    const scope = countyScopeFor(req);
    const data = await reportsService.getOfficerDirectory(scope ?? county);
    res.json({ data });
  } catch (err) {
    next(err);
  }
};

export const exportReport = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    assertCapability(req.user, 'analytics');
    const paramsResult = reportTypeParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      res.status(400).json({
        error_code: 'VALIDATION_ERROR',
        message_key: 'error.validation',
        details: paramsResult.error.flatten(),
        request_id: (req.headers['x-request-id'] as string) ?? '',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    const { county, animalType } = req.query as unknown as LivestockReportQuery;
    const scope = countyScopeFor(req);
    const { type } = paramsResult.data;

    const csv = await reportsService.exportReportCsv(type, { county: scope ?? county, animalType });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};
