import * as communityClient from '../clients/communityServiceClient.js';

export async function listFlagged(page: number, pageSize: number) {
  return communityClient.listFlaggedPosts(page, pageSize);
}

export async function moderatePost(id: string, status: 'active' | 'deleted'): Promise<void> {
  await communityClient.setPostStatus(id, status);
}
