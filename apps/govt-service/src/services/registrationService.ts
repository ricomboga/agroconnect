import * as registrationRepo from '../repositories/registrationRepository.js';
import * as ecitizenClient from '../clients/ecitizenClient.js';
import { publishRegistrationSubmitted } from '../events/producers/registrationSubmittedProducer.js';
import { CreateRegistrationDto } from '../schemas/createRegistration.schema.js';
import { UpdateRegistrationStatusDto } from '../schemas/updateRegistrationStatus.schema.js';
import { PaginationParams } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

export async function submitRegistration(farmerId: string, dto: CreateRegistrationDto) {
  const { registrationRef } = await ecitizenClient.submitFarmRegistration({
    farmerId,
    farmName: dto.farmName,
    county: dto.county,
    areaAcres: dto.areaAcres,
  });

  const registration = await registrationRepo.createRegistration(farmerId, dto, registrationRef);
  await publishRegistrationSubmitted(registration.id, farmerId, registration.county);
  return registration;
}

export async function listRegistrations(farmerId: string, pagination: PaginationParams) {
  const [registrations, total] = await Promise.all([
    registrationRepo.findRegistrationsByFarmer(farmerId, pagination),
    registrationRepo.countRegistrationsByFarmer(farmerId),
  ]);
  return { registrations, total };
}

export async function getRegistration(id: string) {
  const registration = await registrationRepo.findRegistrationById(id);
  if (!registration) {
    throw createError('Registration not found', 404, 'REGISTRATION_NOT_FOUND', 'error.registration.not_found');
  }
  return registration;
}

export async function updateStatus(
  id: string,
  officerId: string,
  dto: UpdateRegistrationStatusDto,
) {
  await getRegistration(id);
  return registrationRepo.updateRegistrationStatus(id, officerId, dto);
}
