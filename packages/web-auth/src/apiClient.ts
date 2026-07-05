import axios, { AxiosError, type AxiosInstance } from 'axios'

type TokenGetter = () => string | null

export interface ApiClientOptions {
  baseURL: string | undefined
  getToken: TokenGetter
  onUnauthorized: () => void | Promise<void>
  onServerError?: (error: AxiosError) => void
}

export function createApiClient(options: ApiClientOptions): AxiosInstance {
  const api = axios.create({
    baseURL: options.baseURL,
    headers: { 'Content-Type': 'application/json' },
  })

  api.interceptors.request.use((config) => {
    const token = options.getToken()
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
        await options.onUnauthorized()
        return Promise.reject(error)
      }

      if (status !== undefined && status >= 500) {
        options.onServerError?.(error)
      }

      return Promise.reject(error)
    },
  )

  return api
}
