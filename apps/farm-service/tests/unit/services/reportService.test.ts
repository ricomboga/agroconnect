import * as farmRepo from '../../../src/repositories/farmRepository';
import * as reportService from '../../../src/services/reportService';

jest.mock('../../../src/repositories/farmRepository', () => ({
  createFarm: jest.fn(),
  findFarmsByOwner: jest.fn(),
  countFarmsByOwner: jest.fn(),
  findFarmById: jest.fn(),
  updateFarm: jest.fn(),
  softDeleteFarm: jest.fn(),
}));

const mockFindFarmById = jest.mocked(farmRepo.findFarmById);

const fakeFarm = { id: 'farm-1', ownerId: 'owner-1', name: 'Test Farm' };

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn() as jest.Mock;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('reportService.generateReport', () => {
  it('throws 404 FARM_NOT_FOUND when farm does not exist', async () => {
    mockFindFarmById.mockResolvedValue(null);

    await expect(
      reportService.generateReport('ghost-farm', 'owner-1', 'farmer'),
    ).rejects.toMatchObject({ statusCode: 404, errorCode: 'FARM_NOT_FOUND' });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns { url } when media-service responds with 200', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://media.example.com/reports/farm-1.pdf' }),
    });

    const result = await reportService.generateReport('farm-1', 'owner-1', 'farmer');

    expect(result).toEqual({ url: 'https://media.example.com/reports/farm-1.pdf' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns { jobId } when media-service responds with async job', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ jobId: 'job-abc-123' }),
    });

    const result = await reportService.generateReport('farm-1', 'owner-1', 'farmer');

    expect(result).toEqual({ jobId: 'job-abc-123' });
  });

  it('throws 502 REPORT_GENERATION_FAILED when media-service returns non-ok status', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
    });

    await expect(
      reportService.generateReport('farm-1', 'owner-1', 'farmer'),
    ).rejects.toMatchObject({ statusCode: 502, errorCode: 'REPORT_GENERATION_FAILED' });
  });

  it('uses undefined ownedBy for admin role', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ jobId: 'job-456' }),
    });

    await reportService.generateReport('farm-1', 'admin-uuid', 'admin');

    expect(mockFindFarmById).toHaveBeenCalledWith('farm-1', undefined);
  });

  it('sends the correct farmId and requestedBy in the request body', async () => {
    mockFindFarmById.mockResolvedValue(fakeFarm as never);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://media.example.com/r.pdf' }),
    });

    await reportService.generateReport('farm-1', 'owner-1', 'farmer');

    const [, options] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string) as { farmId: string; requestedBy: string };
    expect(body).toEqual({ farmId: 'farm-1', requestedBy: 'owner-1' });
  });
});
