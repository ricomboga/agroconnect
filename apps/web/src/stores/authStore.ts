import { create } from 'zustand'
import type { AuthUser } from '@agroconnect/shared'
import { setTokenGetter } from '../lib/api'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean
}

interface AuthActions {
  login(credentials: { phone: string; password: string; deviceId?: string }): Promise<void>
  logout(): Promise<void>
  setUser(user: AuthUser): void
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => {
  setTokenGetter(() => get().accessToken)

  return {
    user: null,
    accessToken: null,
    isAuthenticated: false,

    async login(credentials) {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message ?? 'Login failed')
      }

      const { user, accessToken } = await res.json()
      set({ user, accessToken, isAuthenticated: true })
    },

    async logout() {
      await fetch('/api/auth/logout', { method: 'POST' })
      set({ user: null, accessToken: null, isAuthenticated: false })
    },

    setUser(user) {
      set({ user })
    },
  }
})
