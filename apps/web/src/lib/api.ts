import axios, { AxiosError } from 'axios'
import { toast } from 'sonner'

type TokenGetter = () => string | null

let getToken: TokenGetter = () => null

export function setTokenGetter(fn: TokenGetter) {
  getToken = fn
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status

    if (status === 401) {
      await fetch('/api/auth/logout', { method: 'POST' })
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.href = `/login?returnUrl=${returnUrl}`
      return Promise.reject(error)
    }

    if (status !== undefined && status >= 500) {
      toast.error('Something went wrong. Please try again.')
    }

    return Promise.reject(error)
  },
)

export default api
