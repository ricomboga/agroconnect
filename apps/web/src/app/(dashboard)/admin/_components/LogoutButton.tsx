'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export function LogoutButton() {
  const logout = useAuthStore((s) => s.logout)
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    await logout()
    queryClient.clear()
    window.location.href = '/login'
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-white disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
      {loading ? 'Signing out…' : 'Sign out'}
    </button>
  )
}
