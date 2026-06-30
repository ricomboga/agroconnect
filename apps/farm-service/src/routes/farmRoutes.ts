import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createFarmSchema } from '../schemas/createFarm.schema.js';
import { updateFarmSchema } from '../schemas/updateFarm.schema.js';
import { farmSummaryQuerySchema } from '../schemas/farmSummary.query.schema.js';
import { addWorkerSchema } from '../schemas/addWorker.schema.js';
import { updateWorkerRoleSchema } from '../schemas/updateWorkerRole.schema.js';
import { saveCropDetailsSchema } from '../schemas/saveCropDetails.schema.js';
import { addCropSchema } from '../schemas/addCrop.schema.js';
import { addAnimalSchema } from '../schemas/addAnimal.schema.js';
import { scheduleQuerySchema } from '../schemas/scheduleQuery.schema.js';
import { paginationQuerySchema } from '@agroconnect/shared';
import * as farmController from '../controllers/farmController.js';
import * as summaryController from '../controllers/summaryController.js';
import * as reportController from '../controllers/reportController.js';
import * as workerController from '../controllers/workerController.js';
import * as cropController from '../controllers/cropController.js';
import * as animalController from '../controllers/animalController.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

// Farm CRUD
router.post('/', auth, validateBody(createFarmSchema), (req, res, next) =>
  farmController.createFarm(req as AuthenticatedRequest, res, next),
);
router.get('/', auth, validateQuery(paginationQuerySchema), (req, res, next) =>
  farmController.listFarms(req as AuthenticatedRequest, res, next),
);
router.get('/:farmId', auth, (req, res, next) =>
  farmController.getFarm(req as AuthenticatedRequest, res, next),
);
router.patch('/:farmId', auth, validateBody(updateFarmSchema), (req, res, next) =>
  farmController.updateFarm(req as AuthenticatedRequest, res, next),
);
router.delete('/:farmId', auth, (req, res, next) =>
  farmController.deleteFarm(req as AuthenticatedRequest, res, next),
);
router.get('/:farmId/report', auth, (req, res, next) =>
  reportController.generateReport(req as AuthenticatedRequest, res, next),
);
router.get('/:farmId/summary', auth, validateQuery(farmSummaryQuerySchema), (req, res, next) =>
  summaryController.getFarmSummary(req as AuthenticatedRequest, res, next),
);

// FarmWorker routes
router.post('/:farmId/workers', auth, validateBody(addWorkerSchema), (req, res, next) =>
  workerController.addWorker(req as AuthenticatedRequest, res, next),
);
router.get('/:farmId/workers', auth, (req, res, next) =>
  workerController.listWorkers(req as AuthenticatedRequest, res, next),
);
router.delete('/:farmId/workers/:userId', auth, (req, res, next) =>
  workerController.removeWorker(req as AuthenticatedRequest, res, next),
);
router.patch('/:farmId/workers/:userId', auth, validateBody(updateWorkerRoleSchema), (req, res, next) =>
  workerController.updateWorkerRole(req as AuthenticatedRequest, res, next),
);

// Crop routes
router.post('/:farmId/crops', auth, validateBody(addCropSchema), (req, res, next) =>
  cropController.addCrop(req as AuthenticatedRequest, res, next),
);
router.post('/:farmId/plots/:plotId/crop', auth, validateBody(saveCropDetailsSchema), (req, res, next) =>
  cropController.saveCropDetails(req as AuthenticatedRequest, res, next),
);
router.get('/:farmId/schedule', auth, validateQuery(scheduleQuerySchema), (req, res, next) =>
  cropController.getSchedule(req as AuthenticatedRequest, res, next),
);

// Animal routes
router.post('/:farmId/animals', auth, validateBody(addAnimalSchema), (req, res, next) =>
  animalController.addAnimal(req as AuthenticatedRequest, res, next),
);
router.get('/:farmId/animals', auth, (req, res, next) =>
  animalController.listAnimals(req as AuthenticatedRequest, res, next),
);

export { router as farmRouter };
