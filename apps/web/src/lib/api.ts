import { createApiClient } from '@agroconnect/web-auth'
import { toast } from 'sonner'

type TokenGetter = () => string | null

let getToken: TokenGetter = () => null

export function setTokenGetter(fn: TokenGetter) {
  getToken = fn
}

const api = createApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  getToken: () => getToken(),
  onUnauthorized: async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.href = `/login?returnUrl=${returnUrl}`
  },
  onServerError: () => {
    toast.error('Something went wrong. Please try again.')
  },
})

export default api
