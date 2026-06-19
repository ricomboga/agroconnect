import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getServerSession } from '@/lib/auth'
import { ProfileView } from './_components/ProfileView'

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3000'

export type ProviderType = 'extension_officer' | 'vet_officer' | 'agronomist' | 'soil_lab' | 'equipment_dealer'
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended'

export interface ProviderProfile {
  id: string
  userId: string
  type: ProviderType
  registrationNumber: string
  issuingBody: string
  specialisations: string[]
  countiesServed: string[]
  bio: string
  profilePhotoUrl: string | null
  verificationStatus: VerificationStatus
  ratingAvg: number
  ratingCount: number
  user: {
    name: string
    phone: string
  }
}

const PROVIDER_ROLES: string[] = [
  'extension_officer', 'vet_officer', 'agronomist', 'soil_lab', 'equipment_dealer',
]

async function fetchProfile(token: string): Promise<ProviderProfile | null> {
  try {
    const res = await fetch(`${AUTH_SERVICE_URL}/api/v1/providers/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const body = (await res.json()) as { data: ProviderProfile }
    return body.data
  } catch {
    return null
  }
}

export default async function ProviderProfilePage() {
  const session = await getServerSession()
  if (!session || !PROVIDER_ROLES.includes(session.role as string)) {
    redirect('/dashboard')
  }

  const token = cookies().get('__ac')?.value ?? ''
  const profile = await fetchProfile(token)

  if (!profile) {
    redirect('/provider/register')
  }

  return <ProfileView initialProfile={profile} />
}
