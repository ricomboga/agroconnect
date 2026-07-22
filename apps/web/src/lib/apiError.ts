interface ApiErrorEnvelope {
  error?: {
    message_key?: string
    details?: Record<string, string[] | undefined> | null
  }
  // packages/shared's authenticate/authorize middleware (used ahead of most
  // backend routes, including market-service's) returns this flat shape —
  // {error_code, message_key} at the top level, NOT nested under `error` —
  // which is a different envelope than the one validateBody/errorHandler
  // use below it. Without handling this shape too, any auth/permission
  // failure (expired token, wrong role) silently falls through to the
  // generic fallback instead of telling the user what actually happened.
  error_code?: string
  message_key?: string
  message?: string
}

const MESSAGE_KEY_TEXT: Record<string, string> = {
  'error.validation': 'Some fields are invalid. Please check your input and try again.',
  'error.internal': 'Something went wrong on our end. Please try again.',
  'error.auth.missing_token': 'Your session has expired. Please sign in again.',
  'error.auth.forbidden': "You don't have permission to do that.",
  'error.token.invalid': 'Your session has expired. Please sign in again.',
  'error.token.expired': 'Your session has expired. Please sign in again.',
  'error.token.malformed': 'Your session has expired. Please sign in again.',
}

// market-service (and other backend services) return { error: { code, message_key,
// details, ... } } per docs/api-contracts.md, not a top-level `message` string, so
// reading `response.data.message` always misses and callers fall back to a generic
// toast even when the server explained exactly which field failed.
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object' || !('response' in err)) return fallback
  const data = (err as { response?: { data?: ApiErrorEnvelope } }).response?.data
  if (!data) return fallback

  const fieldErrors = data.error?.details
  if (fieldErrors && typeof fieldErrors === 'object') {
    const firstEntry = Object.entries(fieldErrors).find(([, msgs]) => Array.isArray(msgs) && msgs.length > 0)
    if (firstEntry) {
      const [field, msgs] = firstEntry
      return `${field}: ${msgs![0]}`
    }
  }

  if (data.message) return data.message
  const key = data.error?.message_key ?? data.message_key
  if (key) return MESSAGE_KEY_TEXT[key] ?? fallback
  return fallback
}
