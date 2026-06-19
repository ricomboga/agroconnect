jest.mock('../../../src/services/listingService');

import * as listingService from '../../../src/services/listingService';
import * as listingController from '../../../src/controllers/listingController';
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../src/types/index';

const mockService = listingService as jest.Mocked<typeof listingService>;

function makeRes(): { res: Response; json: jest.Mock; status: jest.Mock; send: jest.Mock } {
  const json = jest.fn();
  const send = jest.fn();
  const status = jest.fn().mockReturnValue({ json, send });
  return { res: { json, status, send } as unknown as Response, json, status, send };
}

function authReq(overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest {
  return {
    user: { id: 'user-001', role: 'farmer', isVerified: true, phone: '+254700000001' },
    params: {},
    body: {},
    query: {},
    headers: {},
    ...overrides,
  } as unknown as AuthenticatedRequest;
}

const next = jest.fn() as NextFunction;

const BASE_LISTING = {
  id: 'listing-001',
  farmerId: 'user-001',
  farmId: 'farm-001',
  harvestId: null,
  crop: 'maize',
  variety: null,
  quantityKg: '500',
  askingPriceKes: '42',
  qualityGrade: 'A' as const,
  availableFrom: new Date(),
  availableUntil: new Date(),
  locationCounty: 'Nakuru',
  locationDescription: null,
  photos: null,
  status: 'active' as const,
  views: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => jest.clearAllMocks());

describe('browseListings', () => {
  it('returns data and meta from service', async () => {
    const meta = { page: 1, page_size: 20, total: 1, total_pages: 1 };
    mockService.browseListings.mockResolvedValue({ listings: [BASE_LISTING], meta });
    const { res, json } = makeRes();
    const req = { query: {} } as Request;
    await listingController.browseListings(req, res, next);
    expect(json).toHaveBeenCalledWith({ data: [BASE_LISTING], meta });
  });

  it('calls next on error', async () => {
    const err = new Error('fail');
    mockService.browseListings.mockRejectedValue(err);
    const { res } = makeRes();
    await listingController.browseListings({} as Request, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('createListing', () => {
  it('responds 201 with created listing', async () => {
    mockService.createListing.mockResolvedValue(BASE_LISTING);
    const { res, status } = makeRes();
    const req = authReq({ body: { crop: 'maize' } });
    await listingController.createListing(req, res, next);
    expect(status).toHaveBeenCalledWith(201);
  });

  it('calls next on error', async () => {
    const err = new Error('fail');
    mockService.createListing.mockRejectedValue(err);
    const { res } = makeRes();
    await listingController.createListing(authReq(), res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('getListing', () => {
  it('returns listing data', async () => {
    mockService.getListing.mockResolvedValue(BASE_LISTING);
    const { res, json } = makeRes();
    const req = { params: { listingId: 'listing-001' } } as unknown as Request;
    await listingController.getListing(req, res, next);
    expect(json).toHaveBeenCalledWith({ data: BASE_LISTING });
  });

  it('calls next on 404 error', async () => {
    const err = new Error('Not found');
    mockService.getListing.mockRejectedValue(err);
    const { res } = makeRes();
    await listingController.getListing({ params: {} } as unknown as Request, res, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('updateListing', () => {
  it('returns updated listing', async () => {
    const updated = { ...BASE_LISTING, crop: 'beans' };
    mockService.updateListing.mockResolvedValue(updated);
    const { res, json } = makeRes();
    const req = authReq({ params: { listingId: 'listing-001' }, body: { crop: 'beans' } });
    await listingController.updateListing(req, res, next);
    expect(json).toHaveBeenCalledWith({ data: updated });
  });

  it('calls next on error', async () => {
    mockService.updateListing.mockRejectedValue(new Error('forbidden'));
    const { res } = makeRes();
    await listingController.updateListing(authReq({ params: { listingId: 'x' } }), res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('withdrawListing', () => {
  it('responds 204 with no body', async () => {
    mockService.withdrawListing.mockResolvedValue(undefined as never);
    const { res, status, send } = makeRes();
    const req = authReq({ params: { listingId: 'listing-001' } });
    await listingController.withdrawListing(req, res, next);
    expect(status).toHaveBeenCalledWith(204);
    expect(send).toHaveBeenCalled();
  });
});

describe('inquireListing', () => {
  it('responds 201 with inquiry sent message', async () => {
    mockService.inquireListing.mockResolvedValue(undefined);
    const { res, status } = makeRes();
    const req = authReq({ params: { listingId: 'listing-001' }, body: { message: 'hello' } });
    await listingController.inquireListing(req, res, next);
    expect(status).toHaveBeenCalledWith(201);
  });
});
