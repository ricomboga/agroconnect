export interface AuthUser {
  id: string;
  phone: string;
  role: string;
  fullName?: string;
  isVerified: boolean;
  partner_bank_id?: string;
}
