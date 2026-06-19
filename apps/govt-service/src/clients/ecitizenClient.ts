// PHASE_2: replace all mocks in this file with real eCitizen OAuth 2.0 calls

export interface NationalIdVerificationResult {
  verified: boolean;
  fullName: string;
  idNumber: string;
}

export interface RegistrationSubmitResult {
  registrationRef: string;
  status: string;
}

export interface RegistrationStatusResult {
  registrationRef: string;
  status: string;
  lastUpdated: string;
}

// PHASE_2: replace mock with real eCitizen OAuth call — POST /ecitizen/api/id/verify
export async function verifyNationalId(
  nationalId: string,
): Promise<NationalIdVerificationResult> {
  return {
    verified: true,
    fullName: 'MOCK FARMER',
    idNumber: nationalId,
  };
}

// PHASE_2: replace mock with real eCitizen OAuth call — POST /moalf/fams/registrations
export async function submitFarmRegistration(_data: {
  farmerId: string;
  farmName: string;
  county: string;
  areaAcres: number;
}): Promise<RegistrationSubmitResult> {
  const ref = `REG-MOCK-${Date.now()}`;
  return { registrationRef: ref, status: 'submitted' };
}

// PHASE_2: replace mock with real eCitizen OAuth call — GET /moalf/fams/registrations/:ref
export async function getRegistrationStatus(
  registrationRef: string,
): Promise<RegistrationStatusResult> {
  return {
    registrationRef,
    status: 'under_review',
    lastUpdated: new Date().toISOString(),
  };
}
