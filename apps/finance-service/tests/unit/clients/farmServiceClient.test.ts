import axios from 'axios';
import * as farmServiceClient from '../../../src/clients/farmServiceClient';

jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
  };
  const mockAxios = {
    create: jest.fn().mockReturnValue(mockAxiosInstance),
    AxiosError: class AxiosError extends Error {
      code?: string;
      response?: { status?: number };
      constructor(message: string, code?: string, response?: { status?: number }) {
        super(message);
        this.name = 'AxiosError';
        this.code = code;
        this.response = response;
      }
    },
  };
  return { ...mockAxios, default: mockAxios };
});

import { AxiosError } from 'axios';

function getMockAxiosInstance() {
  return (axios.create as jest.Mock).mock.results[0]?.value as { get: jest.Mock };
}

beforeEach(() => {
  const instance = getMockAxiosInstance();
  if (instance) instance.get.mockReset();
});

describe('farmServiceClient.getFarmerHarvests', () => {
  it('fetches farms then harvests for each farm', async () => {
    const instance = getMockAxiosInstance();
    instance.get
      .mockResolvedValueOnce({ data: { data: [{ id: 'farm-1' }, { id: 'farm-2' }] } }) // getFarms
      .mockResolvedValueOnce({ data: { data: [{ kg: 100 }] } }) // farm-1 harvests
      .mockResolvedValueOnce({ data: { data: [{ kg: 200 }] } }); // farm-2 harvests

    const result = await farmServiceClient.getFarmerHarvests('farmer-1', 'token-abc');

    expect(instance.get).toHaveBeenCalledWith('/api/v1/farms?page_size=100', expect.anything());
    expect(instance.get).toHaveBeenCalledWith('/api/v1/farms/farm-1/harvests?page_size=100', expect.anything());
    expect(result).toEqual([{ kg: 100 }, { kg: 200 }]);
  });

  it('returns empty array when farmer has no farms', async () => {
    const instance = getMockAxiosInstance();
    instance.get.mockResolvedValueOnce({ data: { data: [] } });

    const result = await farmServiceClient.getFarmerHarvests('farmer-1', 'token-abc');

    expect(result).toEqual([]);
  });

  it('throws CreditScoringError on 5xx error from farm-service', async () => {
    const instance = getMockAxiosInstance();
    const axiosErr = new AxiosError('Server error', undefined, { status: 503 } as never);
    instance.get.mockRejectedValueOnce(axiosErr);

    await expect(
      farmServiceClient.getFarmerHarvests('farmer-1', 'token-abc'),
    ).rejects.toBeInstanceOf(farmServiceClient.CreditScoringError);
  });
});

describe('farmServiceClient.getFarmerInputs', () => {
  it('fetches farms then inputs for each farm', async () => {
    const instance = getMockAxiosInstance();
    instance.get
      .mockResolvedValueOnce({ data: { data: [{ id: 'farm-1' }] } })
      .mockResolvedValueOnce({ data: { data: [{ type: 'fertilizer', quantityKg: 50 }] } });

    const result = await farmServiceClient.getFarmerInputs('farmer-1', 'token-abc');

    expect(instance.get).toHaveBeenCalledWith('/api/v1/farms/farm-1/inputs?page_size=100', expect.anything());
    expect(result).toEqual([{ type: 'fertilizer', quantityKg: 50 }]);
  });

  it('throws CreditScoringError on timeout', async () => {
    const instance = getMockAxiosInstance();
    const axiosErr = new AxiosError('timeout', 'ECONNABORTED');
    instance.get.mockRejectedValueOnce(axiosErr);

    await expect(
      farmServiceClient.getFarmerInputs('farmer-1', 'token-abc'),
    ).rejects.toBeInstanceOf(farmServiceClient.CreditScoringError);
  });
});

describe('farmServiceClient.getFarmerActivities', () => {
  it('fetches farms then activities for each farm', async () => {
    const instance = getMockAxiosInstance();
    instance.get
      .mockResolvedValueOnce({ data: { data: [{ id: 'farm-1' }] } })
      .mockResolvedValueOnce({ data: { data: [{ type: 'planting', status: 'completed' }] } });

    const result = await farmServiceClient.getFarmerActivities('farmer-1', 'token-abc');

    expect(instance.get).toHaveBeenCalledWith('/api/v1/farms/farm-1/activities?page_size=100', expect.anything());
    expect(result).toEqual([{ type: 'planting', status: 'completed' }]);
  });

  it('throws 502 app error on non-retryable error (4xx)', async () => {
    const instance = getMockAxiosInstance();
    const axiosErr = new AxiosError('Not found', undefined, { status: 404 } as never);
    instance.get.mockRejectedValueOnce(axiosErr);

    await expect(
      farmServiceClient.getFarmerActivities('farmer-1', 'token-abc'),
    ).rejects.toMatchObject({ statusCode: 502, errorCode: 'FARM_SERVICE_ERROR' });
  });
});
