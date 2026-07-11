import {
  findDocumentsByUser,
  findHistoryByUser,
  createHistoryEntry,
  findPendingKycUsers,
} from '../repositories/kycRepository.js';
import { updateKycStatus, findUserById } from '../repositories/userRepository.js';
import { createError } from '../middleware/errorHandler.js';

export async function listQueue(filter: { role?: string; county?: string }) {
  const users = await findPendingKycUsers(filter);
  return users.map((u) => ({
    id: u.id,
    full_name: u.fullName,
    phone: u.phone,
    role: u.role,
    county: u.county ?? '',
    kyc_status: u.kycStatus,
    submitted_at: u.createdAt,
  }));
}

export async function getKyc(userId: string) {
  const user = await findUserById(userId);
  if (!user) throw createError('User not found', 404, 'USER_NOT_FOUND', 'error.user_not_found');

  const [documents, history] = await Promise.all([
    findDocumentsByUser(userId),
    findHistoryByUser(userId),
  ]);

  return {
    user: {
      id: user.id,
      full_name: user.fullName,
      phone: user.phone,
      role: user.role,
      county: user.county ?? '',
      kyc_status: user.kycStatus,
    },
    documents: documents.map((d) => ({
      type: d.type,
      url: d.url,
      status: d.status,
      uploaded_at: d.uploadedAt,
    })),
    history: history.map((h) => ({
      action: h.action,
      actor: h.actor,
      note: h.note ?? undefined,
      timestamp: h.createdAt,
    })),
  };
}

export interface KycDecisionParams {
  decision: 'approved' | 'rejected' | 'more_info';
  reason: string;
  documentRequested?: string;
  actor: string;
}

export async function decide(userId: string, params: KycDecisionParams) {
  const user = await findUserById(userId);
  if (!user) throw createError('User not found', 404, 'USER_NOT_FOUND', 'error.user_not_found');

  if (params.decision === 'approved') {
    await updateKycStatus(userId, 'verified');
  } else if (params.decision === 'rejected') {
    await updateKycStatus(userId, 'rejected');
  } else {
    await updateKycStatus(userId, 'submitted');
  }

  const action =
    params.decision === 'approved'
      ? 'KYC Approved'
      : params.decision === 'rejected'
        ? 'KYC Rejected'
        : `More Info Requested${params.documentRequested ? `: ${params.documentRequested}` : ''}`;

  return createHistoryEntry({
    userId,
    action,
    actor: params.actor,
    note: params.reason,
  });
}
