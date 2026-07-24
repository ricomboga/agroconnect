import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { DISEASE_TAXONOMY, TAXONOMY_BY_CODE } from '../taxonomy/diseases.js';
import type { InferenceProvider, InferenceParams, InferenceResult, Prescription, AlternativeDiagnosis } from './types.js';

const SYSTEM_PROMPT = `You are an expert agricultural and veterinary disease diagnostician for Kenya.
You analyse images of crops and livestock and return structured JSON diagnosis results.
You must always respond with valid JSON — no markdown, no prose outside the JSON object.`;

function buildUserPrompt(params: InferenceParams): string {
  const candidates = DISEASE_TAXONOMY
    .filter((d) => d.subjectType === params.subjectType)
    .map((d) => `${d.code} — ${d.name} (${d.subjectName}, ${d.pathogenType}, severity: ${d.severityRange})`)
    .join('\n');

  const symptomsSection = params.symptoms
    ? `\nFarmer-reported symptoms: ${params.symptoms}`
    : '';

  return `Diagnose the ${params.subjectType} shown in the image(s). Subject: ${params.subjectName}.${symptomsSection}

Known diseases you can diagnose:
${candidates}

Return ONLY a JSON object in this exact shape:
{
  "disease_code": "<code from the list above, or UNKNOWN if none match>",
  "disease_name": "<full disease name>",
  "confidence": <0.0–1.0 float>,
  "severity": "<mild|moderate|severe|critical>",
  "description": "<2–3 sentence description of what you see and why you reached this diagnosis>",
  "prescriptions": [
    {
      "step": 1,
      "action": "<clear instruction>",
      "product_name": "<commercial product name or null>",
      "product_type": "<fungicide|bactericide|insecticide|herbicide|vaccine|antibiotic|null>",
      "dosage": "<dosage string or null>",
      "frequency": "<frequency string or null>"
    }
  ],
  "alternative_diagnoses": [
    {
      "disease_code": "<code>",
      "disease_name": "<name>",
      "confidence": <0.0–1.0>,
      "description": "<one sentence why this could also be the diagnosis>"
    }
  ]
}

Rules:
- confidence must reflect your actual certainty (low image quality → lower confidence)
- Include 1–3 alternative diagnoses when plausible alternatives exist
- Prescriptions must be actionable and specific to Kenyan conditions
- Use Kenyan market product names (e.g. Mancozeb 80WP, Dithane M-45, Ridomil Gold)
- severity must be one of: mild, moderate, severe, critical`;
}

interface ClaudeJsonResponse {
  disease_code: string;
  disease_name: string;
  confidence: number;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  description: string;
  prescriptions: Array<{
    step: number;
    action: string;
    product_name: string | null;
    product_type: string | null;
    dosage: string | null;
    frequency: string | null;
  }>;
  alternative_diagnoses: Array<{
    disease_code: string;
    disease_name: string;
    confidence: number;
    description: string;
  }>;
}

const ALLOWED_IMAGE_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
type AllowedImageMediaType = (typeof ALLOWED_IMAGE_MEDIA_TYPES)[number];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mediaType: AllowedImageMediaType }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image ${url}: ${res.status}`);

  const ct = (res.headers.get('content-type') ?? '').split(';')[0].trim();
  if (!ALLOWED_IMAGE_MEDIA_TYPES.includes(ct as AllowedImageMediaType)) {
    throw new Error(`Unsupported image content-type for ${url}: ${ct || '(none)'}`);
  }

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(`Image ${url} exceeds max size of ${MAX_IMAGE_BYTES} bytes (was ${buffer.byteLength})`);
  }

  const base64 = Buffer.from(buffer).toString('base64');
  return { base64, mediaType: ct as AllowedImageMediaType };
}

export class ClaudeVisionProvider implements InferenceProvider {
  readonly name = 'claude-vision';
  private client: Anthropic;

  constructor() {
    if (!config.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY is required when INFERENCE_PROVIDER=claude');
    }
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
  }

  async analyze(params: InferenceParams): Promise<InferenceResult> {
    // Download all images and convert to base64 (Claude requires base64 for vision)
    const imageBlocks: Anthropic.ImageBlockParam[] = await Promise.all(
      params.imageUrls.slice(0, 5).map(async (url) => {
        const { base64, mediaType } = await fetchImageAsBase64(url);
        return {
          type: 'image' as const,
          source: { type: 'base64' as const, media_type: mediaType, data: base64 },
        };
      }),
    );

    const userPrompt = buildUserPrompt(params);

    const message = await this.client.messages.create({
      model: config.claudeModel,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            ...imageBlocks,
            { type: 'text', text: userPrompt },
          ],
        },
      ],
    });

    const rawText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    let parsed: ClaudeJsonResponse;
    try {
      // Strip any accidental markdown fences
      const jsonStr = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      parsed = JSON.parse(jsonStr) as ClaudeJsonResponse;
    } catch {
      logger.error({ rawText }, 'Claude returned non-JSON response');
      throw new Error('AI provider returned an unparseable response');
    }

    // Validate disease code against taxonomy; fall back to name lookup
    let diseaseEntry = TAXONOMY_BY_CODE.get(parsed.disease_code);
    if (!diseaseEntry) {
      diseaseEntry = DISEASE_TAXONOMY.find(
        (d) => d.name.toLowerCase() === parsed.disease_name.toLowerCase()
      );
    }

    const prescriptions: Prescription[] = (parsed.prescriptions ?? []).map((p, i) => ({
      step: p.step ?? i + 1,
      action: p.action,
      productName: p.product_name ?? null,
      productType: p.product_type ?? null,
      dosage: p.dosage ?? null,
      frequency: p.frequency ?? null,
    }));

    const alternativeDiagnoses: AlternativeDiagnosis[] = (parsed.alternative_diagnoses ?? []).map((a) => ({
      diseaseCode: a.disease_code,
      diseaseName: a.disease_name,
      confidence: a.confidence,
      description: a.description,
    }));

    return {
      diseaseCode: diseaseEntry?.code ?? parsed.disease_code,
      diseaseName: diseaseEntry?.name ?? parsed.disease_name,
      confidence: Math.min(Math.max(parsed.confidence ?? 0.5, 0), 1),
      severity: parsed.severity ?? 'moderate',
      description: parsed.description ?? '',
      prescriptions,
      alternativeDiagnoses,
      modelVersion: `${config.claudeModel}`,
      providerName: this.name,
    };
  }
}
