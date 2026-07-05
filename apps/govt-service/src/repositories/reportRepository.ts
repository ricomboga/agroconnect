import { prisma } from '@agroconnect/db/govt';

const PENDING_REGISTRATION_STATUSES = ['pending', 'submitted', 'under_review'] as const;
const PENDING_SUBSIDY_STATUSES = ['submitted', 'under_review'] as const;
const PENDING_LICENSE_STATUSES = ['submitted', 'under_review'] as const;
const ISSUED_SUBSIDY_STATUSES = ['approved', 'disbursed'] as const;

export async function countRegisteredFarms(county?: string) {
  return prisma.farmRegistration.count({ where: { county } });
}

export async function countPendingRegistrations(county?: string) {
  return prisma.farmRegistration.count({
    where: { county, status: { in: [...PENDING_REGISTRATION_STATUSES] } },
  });
}

export async function countSubsidiesIssued(county?: string) {
  return prisma.subsidyApplication.count({
    where: { county, status: { in: [...ISSUED_SUBSIDY_STATUSES] } },
  });
}

export async function countPendingSubsidyApplications(county?: string) {
  return prisma.subsidyApplication.count({
    where: { county, status: { in: [...PENDING_SUBSIDY_STATUSES] } },
  });
}

export async function countPendingLicenseApplications() {
  return prisma.licenseApplication.count({
    where: { status: { in: [...PENDING_LICENSE_STATUSES] } },
  });
}
