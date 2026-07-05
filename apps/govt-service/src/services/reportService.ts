import * as reportRepo from '../repositories/reportRepository.js';

export async function getCountySummary(county?: string) {
  const [
    registeredFarms,
    pendingRegistrations,
    subsidiesIssued,
    pendingSubsidyApplications,
    pendingLicenseApplications,
  ] = await Promise.all([
    reportRepo.countRegisteredFarms(county),
    reportRepo.countPendingRegistrations(county),
    reportRepo.countSubsidiesIssued(county),
    reportRepo.countPendingSubsidyApplications(county),
    // License applications don't carry a county column yet, so this figure is service-wide
    // regardless of the `county` filter — a known limitation, not a bug.
    reportRepo.countPendingLicenseApplications(),
  ]);

  return {
    county: county ?? null,
    registered_farms: registeredFarms,
    subsidies_issued: subsidiesIssued,
    pending_registrations: pendingRegistrations,
    pending_subsidy_applications: pendingSubsidyApplications,
    pending_license_applications: pendingLicenseApplications,
    total_pending_review: pendingRegistrations + pendingSubsidyApplications + pendingLicenseApplications,
  };
}
