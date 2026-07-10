import { prisma } from '@agroconnect/db/finance';
import type { CreateLoanPartnerDto } from '../schemas/createLoanPartner.schema.js';
import type { UpdateLoanPartnerDto } from '../schemas/updateLoanPartner.schema.js';

export async function findAllPartners() {
  return prisma.loanPartner.findMany({
    where:   { active: true },
    orderBy: { name: 'asc' },
  });
}

export async function findPartnerById(id: string) {
  return prisma.loanPartner.findUnique({ where: { id } });
}

export async function createPartner(id: string, dto: CreateLoanPartnerDto) {
  return prisma.loanPartner.create({
    data: {
      id,
      name: dto.name,
      type: dto.type,
      licenceNo: dto.licenceNo,
      paybill: dto.paybill,
      headOfficeCounty: dto.headOfficeCounty,
      headOfficeSubCounty: dto.headOfficeSubCounty,
      minLoanKes: dto.minLoanKes ?? 0,
      maxLoanKes: dto.maxLoanKes ?? 0,
      processingDays: dto.processingDays ?? 7,
      interestRateAnnual: dto.interestRateAnnual ?? 0,
    },
  });
}

export async function updatePartner(id: string, dto: UpdateLoanPartnerDto) {
  return prisma.loanPartner.update({ where: { id }, data: dto });
}
