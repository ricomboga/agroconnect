import { createError } from './errorHandler.js';

export type Capability = 'manage_users' | 'kyc' | 'moderate' | 'analytics';

export interface StaffTier {
  isSuperAdmin?: boolean;
  staffRole?: string;
}

export function assertCapability(user: StaffTier, capability: Capability): void {
  if (user.isSuperAdmin) return;

  if (user.staffRole === 'moderator') {
    if (capability !== 'moderate') {
      throw createError('This action requires a higher staff role', 403, 'FORBIDDEN', 'error.auth.forbidden');
    }
    return;
  }

  if (user.staffRole === 'county_admin' && capability === 'moderate') {
    throw createError('County admins cannot moderate content', 403, 'FORBIDDEN', 'error.auth.forbidden');
  }

  // undefined/'admin' tier, or county_admin on a non-moderate capability: allowed.
  // County-scoping for county_admin is applied by the caller where a county dimension exists.
}
