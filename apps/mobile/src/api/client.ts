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

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(408, 'REQUEST_TIMEOUT', 'Request timed out');
    }
    throw err;
  }
  clearTimeout(timeout);

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
