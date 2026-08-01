import * as loanPartnerRepo from '../repositories/loanPartnerRepository.js';
import * as farmerLenderAssignmentRepo from '../repositories/farmerLenderAssignmentRepository.js';
import * as farmClient from '../clients/farmServiceClient.js';

/**
 * Resolves which farmers a lending partner should see. NGO/grant institutions operate
 * region-wide — their roster is every farmer with a farm in their configured
 * operatingCounties (see LoanPartner.operatingCounties), plus any farmer an admin has
 * explicitly assigned to them (FarmerLenderAssignment) regardless of county — the
 * admin override is additive, it never narrows the county-based roster.
 * Banks/MFIs/saccos resolve purely via FarmerLenderAssignment (loan-relationship based).
 */
export async function resolveFarmerIds(partnerBankId: string, explicitIds?: string[]): Promise<string[]> {
  if (explicitIds && explicitIds.length > 0) return explicitIds;

  const partner = await loanPartnerRepo.findPartnerById(partnerBankId);
  const assignedIds = await farmerLenderAssignmentRepo.findFarmerIdsByLender(partnerBankId);
  if (partner?.type === 'ngo_grant') {
    const countyIds = partner.operatingCounties.length > 0
      ? (await farmClient.getFarmersByCounties(partner.operatingCounties)).map((p) => p.farmerId)
      : [];
    return [...new Set([...countyIds, ...assignedIds])];
  }

  return assignedIds;
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
 * True unless this is an NGO/grant institution that has neither configured any
 * operatingCounties nor had any farmer explicitly assigned to it — used to tell
 * "roster genuinely empty" apart from "roster not configured yet" in report/
 * download UIs.
 */
export async function isRosterConfigured(partnerBankId: string): Promise<boolean> {
  const partner = await loanPartnerRepo.findPartnerById(partnerBankId);
  if (partner?.type === 'ngo_grant') {
    if (partner.operatingCounties.length > 0) return true;
    const assignedIds = await farmerLenderAssignmentRepo.findFarmerIdsByLender(partnerBankId);
    return assignedIds.length > 0;
  }
  return true;
}
