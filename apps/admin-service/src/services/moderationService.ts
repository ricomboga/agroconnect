import * as communityClient from '../clients/communityServiceClient.js';
import { record } from './auditService.js';

export async function listFlagged(page: number, pageSize: number) {
  return communityClient.listFlaggedPosts(page, pageSize);
}

export async function moderatePost(id: string, status: 'active' | 'deleted', actor: string): Promise<void> {
  await communityClient.setPostStatus(id, status);
  await record({
    actor,
    action: status === 'active' ? 'moderation.approved' : 'moderation.removed',
    category: 'moderation',
    refId: id,
  });
}
