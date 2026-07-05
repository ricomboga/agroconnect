export type UserRole =
  | 'farmer'
  | 'extension_officer'
  | 'vet_officer'
  | 'supplier'
  | 'buyer'
  | 'govt_officer'
  | 'admin'
  | 'lender'

export const ROLE_HOME: Record<UserRole, string> = {
  admin: '/admin',
  lender: '/lender',
  farmer: '/farmer/farms',
  extension_officer: '/provider/profile',
  vet_officer: '/provider/profile',
  govt_officer: '/govt',
  supplier: '/supplier',
  buyer: '/',
}
