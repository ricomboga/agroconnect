import * as authClient from '../clients/authServiceClient.js';
import type { ListUsersQuery } from '../schemas/listUsersQuery.schema.js';

export async function listUsers(query: ListUsersQuery) {
  return authClient.listUsers(query);
}

export async function setUserStatus(id: string, isActive: boolean): Promise<void> {
  await authClient.setUserStatus(id, isActive);
}

export async function verifyUser(id: string): Promise<void> {
  await authClient.verifyUser(id);
}
