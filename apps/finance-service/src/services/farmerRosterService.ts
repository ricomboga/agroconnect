import * as loanPartnerRepo from '../repositories/loanPartnerRepository.js';
import * as farmerLenderAssignmentRepo from '../repositories/farmerLenderAssignmentRepository.js';
import * as farmClient from '../clients/farmServiceClient.js';

/**
 * Resolves which farmers a lending partner should see. NGO/grant institutions operate
 * region-wide — their roster is every farmer with a farm in their configured
 * operatingCounties (see LoanPartner.operatingCounties), not who applied for a grant.
 * Banks/MFIs/saccos still resolve via FarmerLenderAssignment (loan-relationship based).
 */
export async function resolveFarmerIds(partnerBankId: string, explicitIds?: string[]): Promise<string[]> {
  if (explicitIds && explicitIds.length > 0) return explicitIds;

  const partner = await loanPartnerRepo.findPartnerById(partnerBankId);
  if (partner?.type === 'ngo_grant') {
    if (partner.operatingCounties.length === 0) return [];
    const profiles = await farmClient.getFarmersByCounties(partner.operatingCounties);
    return profiles.map((p) => p.farmerId);
  }

  return farmerLenderAssignmentRepo.findFarmerIdsByLender(partnerBankId);
}

/**
 * Full region roster (with farm profile + first-registered date) for an NGO/grant
 * institution. Returns [] for non-NGO partner types or NGOs with no configured counties.
 */
export async function getNgoRegionRoster(partnerBankId: string): Promise<farmClient.FarmerRegionProfile[]> {
  const partner = await loanPartnerRepo.findPartnerById(partnerBankId);
  if (partner?.type !== 'ngo_grant' || partner.operatingCounties.length === 0) return [];
  return farmClient.getFarmersByCounties(partner.operatingCounties);
}

/**
 * True unless this is an NGO/grant institution that has not yet configured any
 * operatingCounties — used to tell "roster genuinely empty" apart from
 * "roster not configured yet" in report/download UIs.
 */
export async function isRosterConfigured(partnerBankId: string): Promise<boolean> {
  const partner = await loanPartnerRepo.findPartnerById(partnerBankId);
  if (partner?.type === 'ngo_grant') return partner.operatingCounties.length > 0;
  return true;
}
