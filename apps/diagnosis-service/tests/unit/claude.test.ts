import type { InferenceParams } from '../../src/providers/types';

const createMock = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: class MockAnthropic {
      messages = { create: createMock };
    },
  };
});

function textResponse(json: unknown, opts?: { fenced?: boolean }) {
  const body = JSON.stringify(json);
  const text = opts?.fenced ? `\`\`\`json\n${body}\n\`\`\`` : body;
  return { content: [{ type: 'text', text }] };
}

const VALID_RESPONSE_JSON = {
  disease_code: 'MAI-GLS-001',
  disease_name: 'Grey Leaf Spot',
  confidence: 0.91,
  severity: 'moderate',
  description: 'Grey lesions consistent with Cercospora infection.',
  prescriptions: [
    { step: 1, action: 'Remove infected leaves', product_name: null, product_type: null, dosage: null, frequency: null },
    { step: 2, action: 'Apply Mancozeb 80WP', product_name: 'Mancozeb 80WP', product_type: 'fungicide', dosage: '2.5g/L', frequency: 'Every 7 days' },
  ],
  alternative_diagnoses: [
    { disease_code: 'MAI-NLB-002', disease_name: 'Northern Leaf Blight', confidence: 0.3, description: 'Lesion shape less consistent, but possible.' },
  ],
};

const baseParams: InferenceParams = {
  imageUrls: ['https://media.example.com/img1.jpg'],
  subjectType: 'plant',
  subjectName: 'maize',
};

describe('ClaudeVisionProvider', () => {
  beforeEach(() => {
    createMock.mockReset();
    (global as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'image/jpeg' },
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    });
  });

  async function loadProvider() {
    const { ClaudeVisionProvider } = await import('../../src/providers/claude');
    return new ClaudeVisionProvider();
  }

  it('maps a valid Claude JSON response to InferenceResult', async () => {
    createMock.mockResolvedValue(textResponse(VALID_RESPONSE_JSON));
    const provider = await loadProvider();

    const result = await provider.analyze(baseParams);

    expect(result.diseaseCode).toBe('MAI-GLS-001');
    expect(result.diseaseName).toBe('Grey Leaf Spot');
    expect(result.confidence).toBe(0.91);
    expect(result.severity).toBe('moderate');
    expect(result.prescriptions).toHaveLength(2);
    expect(result.prescriptions[1]).toEqual({
      step: 2,
      action: 'Apply Mancozeb 80WP',
      productName: 'Mancozeb 80WP',
      productType: 'fungicide',
      dosage: '2.5g/L',
      frequency: 'Every 7 days',
    });
    expect(result.alternativeDiagnoses).toHaveLength(1);
    expect(result.alternativeDiagnoses[0].diseaseCode).toBe('MAI-NLB-002');
    expect(result.modelVersion).toBe('claude-sonnet-4-6');
    expect(result.providerName).toBe('claude-vision');
  });

  it('falls back to disease-name lookup when disease_code is unrecognized', async () => {
    createMock.mockResolvedValue(textResponse({
      ...VALID_RESPONSE_JSON,
      disease_code: 'NOT-A-REAL-CODE',
      disease_name: 'Grey Leaf Spot',
    }));
    const provider = await loadProvider();

    const result = await provider.analyze(baseParams);

    expect(result.diseaseCode).toBe('MAI-GLS-001');
    expect(result.diseaseName).toBe('Grey Leaf Spot');
  });

  it('passes through raw code/name when neither code nor name match the taxonomy', async () => {
    createMock.mockResolvedValue(textResponse({
      ...VALID_RESPONSE_JSON,
      disease_code: 'UNKNOWN',
      disease_name: 'Something Unrecognized',
    }));
    const provider = await loadProvider();

    const result = await provider.analyze(baseParams);

    expect(result.diseaseCode).toBe('UNKNOWN');
    expect(result.diseaseName).toBe('Something Unrecognized');
  });

  it('clamps confidence above 1 down to 1', async () => {
    createMock.mockResolvedValue(textResponse({ ...VALID_RESPONSE_JSON, confidence: 1.4 }));
    const provider = await loadProvider();
    const result = await provider.analyze(baseParams);
    expect(result.confidence).toBe(1);
  });

  it('clamps confidence below 0 up to 0', async () => {
    createMock.mockResolvedValue(textResponse({ ...VALID_RESPONSE_JSON, confidence: -0.2 }));
    const provider = await loadProvider();
    const result = await provider.analyze(baseParams);
    expect(result.confidence).toBe(0);
  });

  it('defaults confidence to 0.5 when missing from the response', async () => {
    const { confidence, ...rest } = VALID_RESPONSE_JSON;
    createMock.mockResolvedValue(textResponse(rest));
    const provider = await loadProvider();
    const result = await provider.analyze(baseParams);
    expect(result.confidence).toBe(0.5);
  });

  it('rejects when Claude returns unparseable text', async () => {
    createMock.mockResolvedValue({ content: [{ type: 'text', text: 'not json at all' }] });
    const provider = await loadProvider();

    await expect(provider.analyze(baseParams)).rejects.toThrow('AI provider returned an unparseable response');
  });

  it('strips markdown code fences before parsing', async () => {
    createMock.mockResolvedValue(textResponse(VALID_RESPONSE_JSON, { fenced: true }));
    const provider = await loadProvider();

    const result = await provider.analyze(baseParams);
    expect(result.diseaseCode).toBe('MAI-GLS-001');
  });

  it('sends one image block per URL, up to 5', async () => {
    createMock.mockResolvedValue(textResponse(VALID_RESPONSE_JSON));
    const provider = await loadProvider();

    await provider.analyze({ ...baseParams, imageUrls: ['a', 'b', 'c'] });
    expect((global.fetch as jest.Mock)).toHaveBeenCalledTimes(3);

    (global.fetch as jest.Mock).mockClear();
    createMock.mockClear();
    createMock.mockResolvedValue(textResponse(VALID_RESPONSE_JSON));

    await provider.analyze({ ...baseParams, imageUrls: ['a', 'b', 'c', 'd', 'e', 'f'] });
    expect((global.fetch as jest.Mock)).toHaveBeenCalledTimes(5);
  });

  it('handles zero images (text-only mode) without crashing', async () => {
    createMock.mockResolvedValue(textResponse(VALID_RESPONSE_JSON));
    const provider = await loadProvider();

    const result = await provider.analyze({ ...baseParams, imageUrls: [], symptoms: 'Leaves have grey streaks' });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.diseaseCode).toBe('MAI-GLS-001');
    const callArgs = createMock.mock.calls[0][0];
    const imageBlocks = callArgs.messages[0].content.filter((b: { type: string }) => b.type === 'image');
    expect(imageBlocks).toHaveLength(0);
  });

  it('rejects images with a non-image content-type', async () => {
    (global as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'text/html' },
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    });
    const provider = await loadProvider();

    await expect(provider.analyze(baseParams)).rejects.toThrow('Unsupported image content-type');
  });

  it('rejects images larger than the max size', async () => {
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    (global as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'image/jpeg' },
      arrayBuffer: async () => big.buffer,
    });
    const provider = await loadProvider();

    await expect(provider.analyze(baseParams)).rejects.toThrow('exceeds max size');
  });

  it('throws at construction time when ANTHROPIC_API_KEY is missing', async () => {
    await jest.isolateModulesAsync(async () => {
      const originalKey = process.env['ANTHROPIC_API_KEY'];
      process.env['ANTHROPIC_API_KEY'] = '';
      try {
        const { ClaudeVisionProvider } = await import('../../src/providers/claude');
        expect(() => new ClaudeVisionProvider()).toThrow('ANTHROPIC_API_KEY is required when INFERENCE_PROVIDER=claude');
      } finally {
        process.env['ANTHROPIC_API_KEY'] = originalKey;
      }
    });
  });
});
