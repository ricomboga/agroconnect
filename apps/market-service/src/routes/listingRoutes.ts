import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createListingSchema } from '../schemas/createListing.schema.js';
import { updateListingSchema } from '../schemas/updateListing.schema.js';
import { listListingsQuerySchema } from '../schemas/listListings.query.schema.js';
import { createInquirySchema } from '../schemas/createInquiry.schema.js';
import * as listingController from '../controllers/listingController.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

router.get('/', validateQuery(listListingsQuerySchema), listingController.browseListings);

router.post('/', auth, validateBody(createListingSchema), (req, res, next) =>
  listingController.createListing(req as AuthenticatedRequest, res, next),
);

router.get('/:listingId', listingController.getListing);

router.patch('/:listingId', auth, validateBody(updateListingSchema), (req, res, next) =>
  listingController.updateListing(req as AuthenticatedRequest, res, next),
);

router.delete('/:listingId', auth, (req, res, next) =>
  listingController.withdrawListing(req as AuthenticatedRequest, res, next),
);

router.post('/:listingId/inquire', auth, validateBody(createInquirySchema), (req, res, next) =>
  listingController.inquireListing(req as AuthenticatedRequest, res, next),
);

export { router as listingRouter };
