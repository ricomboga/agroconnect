import { Request, Response, NextFunction } from 'express';
import * as licenseService from '../../../src/services/licenseService';
import * as subsidyService from '../../../src/services/subsidyService';
import * as registrationService from '../../../src/services/registrationService';
import * as documentService from '../../../src/services/documentService';
import * as licenseController from '../../../src/controllers/licenseController';
import * as subsidyController from '../../../src/controllers/subsidyController';
import * as registrationController from '../../../src/controllers/registrationController';
import * as documentController from '../../../src/controllers/documentController';

jest.mock('../../../src/services/licenseService', () => ({
  applyForLicense: jest.fn(),
  listLicenses: jest.fn(),
  getLicense: jest.fn(),
}));

jest.mock('../../../src/services/subsidyService', () => ({
  listPrograms: jest.fn(),
  applyForSubsidy: jest.fn(),
  listApplications: jest.fn(),
  createProgram: jest.fn(),
}));

jest.mock('../../../src/services/registrationService', () => ({
  submitRegistration: jest.fn(),
  listRegistrations: jest.fn(),
  getRegistration: jest.fn(),
  updateStatus: jest.fn(),
}));

jest.mock('../../../src/services/documentService', () => ({
  uploadDocument: jest.fn(),
  listDocuments: jest.fn(),
}));

const mockApplyForLicense = jest.mocked(licenseService.applyForLicense);
const mockListLicenses = jest.mocked(licenseService.listLicenses);
const mockListPrograms = jest.mocked(subsidyService.listPrograms);
const mockApplyForSubsidy = jest.mocked(subsidyService.applyForSubsidy);
const mockListApplications = jest.mocked(subsidyService.listApplications);
const mockCreateProgram = jest.mocked(subsidyService.createProgram);
const mockSubmitRegistration = jest.mocked(registrationService.submitRegistration);
const mockListRegistrations = jest.mocked(registrationService.listRegistrations);
const mockGetRegistration = jest.mocked(registrationService.getRegistration);
const mockUpdateStatus = jest.mocked(registrationService.updateStatus);
const mockUploadDocument = jest.mocked(documentService.uploadDocument);
const mockListDocuments = jest.mocked(documentService.listDocuments);

function makeAuthReq(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 'user-1', role: 'farmer', phone: '+254700000001' },
    params: {},
    query: {},
    body: {},
    ...overrides,
  };
}

function makeRes(): Response {
  const res = {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

const next = jest.fn() as NextFunction;
beforeEach(() => jest.clearAllMocks());

// ─── licenseController ───────────────────────────────────────────────────────

describe('licenseController.applyForLicense', () => {
  it('creates license and responds 201', async () => {
    const fakeLicense = { id: 'lic-1', licenseType: 'pesticide_use', status: 'pending' };
    mockApplyForLicense.mockResolvedValue(fakeLicense as never);

    const req = makeAuthReq({ body: { farmId: 'farm-1', licenseType: 'pesticide_use' } });
    const res = makeRes();

    await licenseController.applyForLicense(req as never, res, next);

    expect(mockApplyForLicense).toHaveBeenCalledWith('user-1', req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: fakeLicense });
  });

  it('forwards errors to next', async () => {
    mockApplyForLicense.mockRejectedValue(new Error('Validation failed'));
    await licenseController.applyForLicense(makeAuthReq() as never, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('licenseController.listLicenses', () => {
  it('returns licenses with pagination meta', async () => {
    const fakeLicenses = [{ id: 'lic-1' }];
    mockListLicenses.mockResolvedValue({ licenses: fakeLicenses, total: 1 } as never);

    const req = makeAuthReq({ query: { page: '1', page_size: '20' } });
    const res = makeRes();

    await licenseController.listLicenses(req as never, res, next);

    expect(res.json).toHaveBeenCalledWith({
      data: fakeLicenses,
      meta: expect.objectContaining({ total: 1, page_size: 20 }),
    });
  });

  it('forwards errors to next', async () => {
    mockListLicenses.mockRejectedValue(new Error('DB error'));
    await licenseController.listLicenses(makeAuthReq() as never, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ─── subsidyController ───────────────────────────────────────────────────────

describe('subsidyController.listPrograms', () => {
  it('returns programs with pagination meta', async () => {
    const fakePrograms = [{ id: 'prog-1', name: 'Fertilizer Subsidy' }];
    mockListPrograms.mockResolvedValue({ programs: fakePrograms, total: 1 } as never);

    const req = { query: {} } as Request;
    const res = makeRes();

    await subsidyController.listPrograms(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      data: fakePrograms,
      meta: expect.objectContaining({ total: 1 }),
    });
  });

  it('forwards errors to next', async () => {
    mockListPrograms.mockRejectedValue(new Error('DB error'));
    await subsidyController.listPrograms({ query: {} } as Request, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('subsidyController.applyForSubsidy', () => {
  it('creates application and responds 201', async () => {
    const fakeApp = { id: 'app-1', status: 'pending' };
    mockApplyForSubsidy.mockResolvedValue(fakeApp as never);

    const req = makeAuthReq({
      params: { programId: 'prog-1' },
      body: { farmId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
    });
    const res = makeRes();

    await subsidyController.applyForSubsidy(req as never, res, next);

    expect(mockApplyForSubsidy).toHaveBeenCalledWith('user-1', 'prog-1', req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: fakeApp });
  });

  it('forwards errors to next', async () => {
    mockApplyForSubsidy.mockRejectedValue(new Error('Not found'));
    await subsidyController.applyForSubsidy(makeAuthReq({ params: { programId: 'x' } }) as never, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('subsidyController.listApplications', () => {
  it('returns applications with pagination meta', async () => {
    const fakeApps = [{ id: 'app-1' }];
    mockListApplications.mockResolvedValue({ applications: fakeApps, total: 1 } as never);

    const req = makeAuthReq({ query: {} });
    const res = makeRes();

    await subsidyController.listApplications(req as never, res, next);

    expect(res.json).toHaveBeenCalledWith({
      data: fakeApps,
      meta: expect.objectContaining({ total: 1 }),
    });
  });

  it('forwards errors to next', async () => {
    mockListApplications.mockRejectedValue(new Error('DB error'));
    await subsidyController.listApplications(makeAuthReq() as never, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('subsidyController.createProgram', () => {
  const fakeProgram = { id: 'prog-1', name: 'Fertiliser Subsidy' };

  it('allows a standard admin to create a program for any counties', async () => {
    mockCreateProgram.mockResolvedValue(fakeProgram as never);

    const req = makeAuthReq({
      user: { id: 'admin-1', role: 'admin', phone: '+254700000002' },
      body: { eligible_counties: ['Kitui', 'Machakos'] },
    });
    const res = makeRes();

    await subsidyController.createProgram(req as never, res, next);

    expect(mockCreateProgram).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: fakeProgram });
  });

  it('allows a super admin unrestricted, regardless of county scope', async () => {
    mockCreateProgram.mockResolvedValue(fakeProgram as never);

    const req = makeAuthReq({
      user: { id: 'super-1', role: 'admin', phone: '+254700000003', isSuperAdmin: true, staffRole: 'county_admin', county: 'Kitui' },
      body: { eligible_counties: ['Nairobi', 'Mombasa'] },
    });
    const res = makeRes();

    await subsidyController.createProgram(req as never, res, next);

    expect(mockCreateProgram).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('rejects a moderator outright', async () => {
    const req = makeAuthReq({
      user: { id: 'mod-1', role: 'admin', phone: '+254700000004', staffRole: 'moderator' },
      body: { eligible_counties: ['Kitui'] },
    });
    const res = makeRes();

    await subsidyController.createProgram(req as never, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    expect(mockCreateProgram).not.toHaveBeenCalled();
  });

  it('rejects a county admin whose eligible_counties is not exactly their own county', async () => {
    const req = makeAuthReq({
      user: { id: 'county-1', role: 'admin', phone: '+254700000005', staffRole: 'county_admin', county: 'Kitui' },
      body: { eligible_counties: ['Kitui', 'Machakos'] },
    });
    const res = makeRes();

    await subsidyController.createProgram(req as never, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    expect(mockCreateProgram).not.toHaveBeenCalled();
  });

  it('allows a county admin to create a program restricted to their own county', async () => {
    mockCreateProgram.mockResolvedValue(fakeProgram as never);

    const req = makeAuthReq({
      user: { id: 'county-1', role: 'admin', phone: '+254700000005', staffRole: 'county_admin', county: 'Kitui' },
      body: { eligible_counties: ['Kitui'] },
    });
    const res = makeRes();

    await subsidyController.createProgram(req as never, res, next);

    expect(mockCreateProgram).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

// ─── registrationController ──────────────────────────────────────────────────

describe('registrationController.submitRegistration', () => {
  it('creates registration and responds 201', async () => {
    const fakeReg = { id: 'reg-1', status: 'pending' };
    mockSubmitRegistration.mockResolvedValue(fakeReg as never);

    const req = makeAuthReq({ body: { farmName: 'Test Farm', county: 'Meru', areaAcres: 5 } });
    const res = makeRes();

    await registrationController.submitRegistration(req as never, res, next);

    expect(mockSubmitRegistration).toHaveBeenCalledWith('user-1', req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: fakeReg });
  });

  it('forwards errors to next', async () => {
    mockSubmitRegistration.mockRejectedValue(new Error('Validation failed'));
    await registrationController.submitRegistration(makeAuthReq() as never, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('registrationController.listRegistrations', () => {
  it('returns registrations with pagination meta', async () => {
    const fakeRegs = [{ id: 'reg-1' }];
    mockListRegistrations.mockResolvedValue({ registrations: fakeRegs, total: 1 } as never);

    const req = makeAuthReq({ query: {} });
    const res = makeRes();

    await registrationController.listRegistrations(req as never, res, next);

    expect(res.json).toHaveBeenCalledWith({
      data: fakeRegs,
      meta: expect.objectContaining({ total: 1 }),
    });
  });

  it('forwards errors to next', async () => {
    mockListRegistrations.mockRejectedValue(new Error('DB error'));
    await registrationController.listRegistrations(makeAuthReq() as never, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('registrationController.getRegistration', () => {
  it('returns the registration', async () => {
    const fakeReg = { id: 'reg-1', status: 'pending' };
    mockGetRegistration.mockResolvedValue(fakeReg as never);

    const req = makeAuthReq({ params: { registrationId: 'reg-1' } });
    const res = makeRes();

    await registrationController.getRegistration(req as never, res, next);

    expect(mockGetRegistration).toHaveBeenCalledWith('reg-1');
    expect(res.json).toHaveBeenCalledWith({ data: fakeReg });
  });

  it('forwards errors to next', async () => {
    mockGetRegistration.mockRejectedValue(new Error('Not found'));
    await registrationController.getRegistration(makeAuthReq({ params: { registrationId: 'x' } }) as never, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('registrationController.updateStatus', () => {
  it('updates registration status and returns updated record', async () => {
    const fakeReg = { id: 'reg-1', status: 'approved' };
    mockUpdateStatus.mockResolvedValue(fakeReg as never);

    const req = makeAuthReq({
      params: { registrationId: 'reg-1' },
      body: { status: 'approved', officerNotes: 'All good' },
    });
    const res = makeRes();

    await registrationController.updateStatus(req as never, res, next);

    expect(mockUpdateStatus).toHaveBeenCalledWith('reg-1', 'user-1', req.body);
    expect(res.json).toHaveBeenCalledWith({ data: fakeReg });
  });

  it('forwards errors to next', async () => {
    mockUpdateStatus.mockRejectedValue(new Error('Not found'));
    await registrationController.updateStatus(makeAuthReq({ params: { registrationId: 'x' } }) as never, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ─── documentController ──────────────────────────────────────────────────────

describe('documentController.uploadDocument', () => {
  it('uploads document and responds 201 when file present', async () => {
    const fakeDoc = { id: 'doc-1', mediaUrl: 'https://media.example.com/docs/id.pdf' };
    mockUploadDocument.mockResolvedValue(fakeDoc as never);

    const fakeFile = {
      buffer: Buffer.from('pdf'),
      originalname: 'id.pdf',
      mimetype: 'application/pdf',
    };
    const req = makeAuthReq({ file: fakeFile, body: { documentType: 'national_id' } });
    const res = makeRes();

    await documentController.uploadDocument(req as never, res, next);

    expect(mockUploadDocument).toHaveBeenCalledWith('user-1', fakeFile, { documentType: 'national_id' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: fakeDoc });
  });

  it('calls next with 400 FILE_REQUIRED when no file', async () => {
    const req = makeAuthReq({ file: undefined });
    await documentController.uploadDocument(req as never, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400, errorCode: 'FILE_REQUIRED' }));
  });

  it('forwards errors to next', async () => {
    const fakeFile = { buffer: Buffer.from('pdf'), originalname: 'id.pdf', mimetype: 'application/pdf' };
    mockUploadDocument.mockRejectedValue(new Error('Media upload failed'));
    const req = makeAuthReq({ file: fakeFile, body: { documentType: 'national_id' } });
    await documentController.uploadDocument(req as never, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('documentController.listDocuments', () => {
  it('returns documents with pagination meta', async () => {
    const fakeDocs = [{ id: 'doc-1' }];
    mockListDocuments.mockResolvedValue({ documents: fakeDocs, total: 1 } as never);

    const req = makeAuthReq({ query: {} });
    const res = makeRes();

    await documentController.listDocuments(req as never, res, next);

    expect(res.json).toHaveBeenCalledWith({
      data: fakeDocs,
      meta: expect.objectContaining({ total: 1 }),
    });
  });

  it('forwards errors to next', async () => {
    mockListDocuments.mockRejectedValue(new Error('DB error'));
    await documentController.listDocuments(makeAuthReq() as never, makeRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
