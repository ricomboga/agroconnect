import * as authClient from '../clients/authServiceClient.js';

export interface RecordAuditParams {
  actor: string;
  action: string;
  category: 'kyc' | 'moderation' | 'program' | 'user';
  refId?: string;
  note?: string;
}

export async function record(params: RecordAuditParams): Promise<void> {
  await authClient.createAuditLog(params);
}

export async function list(page: number, pageSize: number) {
  return authClient.listAuditLogs(page, pageSize);
}
