'use client'

import { useSearchParams } from 'next/navigation'
import { SuccessScreen } from '@agroconnect/web-ui'

export default function RoleCreateSuccessPage() {
  const searchParams = useSearchParams()
  const role = searchParams.get('role') ?? 'User'
  const userId = searchParams.get('userId')

  return (
    <SuccessScreen
      title="Account Created Successfully!"
      sub={`${role} account was created and an SMS with login details was sent.`}
      credentials={[{ label: 'Temp PIN', value: '1234 — must change on login' }]}
      nextActions={[
        { label: '👤 View User Profile', href: userId ? `/admin/users/${userId}` : '/admin/users' },
        { label: '➕ Create Another User', href: '/admin/users/new' },
      ]}
    />
  )
}
