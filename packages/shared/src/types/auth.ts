export interface AuthUser {
  id: string;
  phone: string;
  role: string;
  fullName?: string;
  isVerified: boolean;
  partner_bank_id?: string;
  isSuperAdmin?: boolean;
  staffRole?: string;
  county?: string;
}
