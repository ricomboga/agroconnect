import { apiFetch } from './client';

export type RegistrationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';
export type SubsidyStatus = 'pending' | 'approved' | 'disbursed' | 'rejected';
export type LicenseStatus = 'pending' | 'issued' | 'rejected' | 'expired';

export interface FarmRegistration {
  id: string;
  farmId: string;
  farmName: string;
  county: string;
  status: RegistrationStatus;
  registrationNumber: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  notes: string | null;
}

export interface SubsidyProgram {
  id: string;
  name: string;
  description: string;
  eligibilityCriteria: string;
  benefitDescription: string;
  applicationDeadline: string | null;
  county: string | null;
}

export interface SubsidyApplication {
  id: string;
  programId: string;
  programName: string;
  status: SubsidyStatus;
  submittedAt: string;
  approvedAt: string | null;
  notes: string | null;
}

export interface FarmLicense {
  id: string;
  type: string;
  issuingBody: string;
  status: LicenseStatus;
  licenseNumber: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  submittedAt: string;
}

export interface UploadDocumentDto {
  documentType: 'national_id' | 'title_deed' | 'lease_agreement' | 'other';
  mediaKey: string;
  description?: string;
}

export const govtApi = {
  registrations: {
    list: () =>
      apiFetch<{ data: FarmRegistration[] }>('/govt/registrations'),
    get: (id: string) =>
      apiFetch<{ data: FarmRegistration }>(`/govt/registrations/${id}`),
    create: (farmId: string, county: string) =>
      apiFetch<{ data: FarmRegistration }>('/govt/registrations', {
        method: 'POST',
        body: JSON.stringify({ farmId, county }),
      }),
  },
  subsidies: {
    list: () =>
      apiFetch<{ data: SubsidyProgram[] }>('/govt/subsidies'),
    applications: () =>
      apiFetch<{ data: SubsidyApplication[] }>('/govt/subsidies/applications'),
    apply: (programId: string, farmId: string, notes?: string) =>
      apiFetch<{ data: SubsidyApplication }>(`/govt/subsidies/${programId}/apply`, {
        method: 'POST',
        body: JSON.stringify({ farmId, notes }),
      }),
  },
  licenses: {
    list: () =>
      apiFetch<{ data: FarmLicense[] }>('/govt/licenses'),
    create: (type: string, farmId: string) =>
      apiFetch<{ data: FarmLicense }>('/govt/licenses', {
        method: 'POST',
        body: JSON.stringify({ type, farmId }),
      }),
  },
  documents: {
    upload: (dto: UploadDocumentDto) =>
      apiFetch<{ data: { id: string } }>('/govt/documents', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
  },
};
