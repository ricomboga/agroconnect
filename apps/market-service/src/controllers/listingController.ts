import { Response, NextFunction, Request } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as listingService from '../services/listingService.js';
import { ListListingsQuery } from '../schemas/listListings.query.schema.js';

/**
 * @openapi
 * /api/v1/market/listings:
 *   get:
 *     summary: Browse active produce listings
 *     tags: [Listings]
 *     parameters:
 *       - in: query
 *         name: crop
 *         schema: { type: string }
 *       - in: query
 *         name: county
 *         schema: { type: string }
 *       - in: query
 *         name: quality_grade
 *         schema: { type: string, enum: [A, B, C, reject] }
 *       - in: query
 *         name: available_from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: available_until
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: page_size
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of listings
 *       400:
 *         description: Validation error
 */
export async function browseListings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await listingService.browseListings(req.query as unknown as ListListingsQuery);
    res.json({ data: result.listings, meta: result.meta });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/market/listings:
 *   post:
 *     summary: Create a produce listing
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Listing created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Role must be farmer
 */
export async function createListing(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const listing = await listingService.createListing(req.user.id, req.body);
    res.status(201).json({ data: listing });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/market/listings/{listingId}:
 *   get:
 *     summary: Get listing detail
 *     tags: [Listings]
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Listing detail
 *       404:
 *         description: Listing not found
 */
export async function getListing(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const listing = await listingService.getListing(req.params['listingId'] as string);
    res.json({ data: listing });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/market/listings/{listingId}:
 *   patch:
 *     summary: Update a listing (owner only)
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Listing updated
 *       403:
 *         description: Not the owner
 *       404:
 *         description: Listing not found
 */
export async function updateListing(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const listing = await listingService.updateListing(
      req.params['listingId'] as string,
      req.user.id,
      req.body,
    );
    res.json({ data: listing });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/market/listings/{listingId}:
 *   delete:
 *     summary: Withdraw a listing (owner only)
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Listing withdrawn
 *       403:
 *         description: Not the owner
 *       404:
 *         description: Listing not found
 */
export async function withdrawListing(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await listingService.withdrawListing(req.params['listingId'] as string, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/market/listings/{listingId}/inquire:
 *   post:
 *     summary: Send an inquiry to the listing owner
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Inquiry sent
 *       404:
 *         description: Listing not found
 */
export async function inquireListing(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await listingService.inquireListing(
      req.params['listingId'] as string,
      req.user.id,
      req.body,
    );
    res.status(201).json({ data: { message: 'inquiry.sent' } });
  } catch (err) {
    next(err);
  }
}
