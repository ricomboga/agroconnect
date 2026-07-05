import * as authClient from '../clients/authServiceClient.js';
import { record } from './auditService.js';
import type { KycDecisionDto } from '../schemas/kycDecision.schema.js';

export async function listQueue(filter: { role?: string; county?: string }) {
  return authClient.getKycQueue(filter);
}

export async function getKyc(userId: string) {
  return authClient.getKyc(userId);
}

export async function decide(userId: string, dto: KycDecisionDto, actor: string) {
  const result = await authClient.decideKyc(userId, { ...dto, actor });
  await record({
    actor,
    action: `kyc.${dto.decision}`,
    category: 'kyc',
    refId: userId,
    note: dto.reason,
  });
  return result;
}
