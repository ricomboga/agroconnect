import { useAuthStore } from '../stores/authStore';

const BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Access tokens are short-lived (15 min) — dedupe concurrent 401s onto a single
// refresh attempt so a burst of parallel requests doesn't race the refresh-token
// rotation (the second call would otherwise reuse an already-rotated-out token).
let refreshInFlight: Promise<boolean> | null = null;

async function refreshOnce(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = useAuthStore
      .getState()
      .refreshSession()
      .then(() => useAuthStore.getState().token !== null)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function doFetch(path: string, options: RequestInit, token: string | null): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetch(`${BASE_URL}${path}`, { ...options, headers, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(408, 'REQUEST_TIMEOUT', 'Request timed out');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let token = useAuthStore.getState().token;
  let response = await doFetch(path, options, token);

  if (response.status === 401) {
    const refreshed = await refreshOnce();
    if (refreshed) {
      token = useAuthStore.getState().token;
      response = await doFetch(path, options, token);
    }
  }

  if (response.status === 401) {
    await useAuthStore.getState().logout();
    throw new ApiError(401, 'UNAUTHORIZED', 'Session expired');
  }

  if (!response.ok) {
    let errorCode = 'UNKNOWN_ERROR';
    let message = response.statusText;
    try {
      const body = await response.json() as {
        error?: { code?: string; message?: string };
        error_code?: string;
        message_key?: string;
      };
      if (body.error?.code) errorCode = body.error.code;
      else if (body.error_code) errorCode = body.error_code;
      if (body.error?.message) message = body.error.message;
      else if (body.message_key) message = body.message_key;
      throw new ApiError(response.status, errorCode, message);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(response.status, errorCode, message);
    }
  }

  return response.json() as Promise<T>;
}
