import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'auth_access_token';
const REFRESH_KEY = 'auth_refresh_token';
const BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';

export interface AuthUser {
  id: string;
  fullName: string;
  phone: string;
  role: string;
  county?: string | null;
}

interface LoginResponse {
  data: {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  };
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { phone: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: { message?: string } };
        throw new Error(body.error?.message ?? 'Login failed');
      }
      const { data } = await res.json() as LoginResponse;
      await SecureStore.setItemAsync(ACCESS_KEY, data.accessToken);
      await SecureStore.setItemAsync(REFRESH_KEY, data.refreshToken);
      set({ token: data.accessToken, refreshToken: data.refreshToken, user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    const { token } = get();
    try {
      if (token) {
        await fetch(`${BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // ignore network errors on logout — clear local state regardless
    }
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
  },

  refreshSession: async () => {
    const stored = await SecureStore.getItemAsync(REFRESH_KEY);
    if (!stored) { set({ isAuthenticated: false }); return; }
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: stored }),
    });
    if (!res.ok) {
      await SecureStore.deleteItemAsync(ACCESS_KEY);
      await SecureStore.deleteItemAsync(REFRESH_KEY);
      set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
      return;
    }
    const { data } = await res.json() as LoginResponse;
    await SecureStore.setItemAsync(ACCESS_KEY, data.accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, data.refreshToken);
    set({ token: data.accessToken, refreshToken: data.refreshToken, user: data.user, isAuthenticated: true });
  },

  changePassword: async (currentPassword, newPassword) => {
    const { token } = get();
    const res = await fetch(`${BASE_URL}/auth/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    if (!res.ok) {
      const body = await res.json() as { error?: { message?: string } };
      throw new Error(body.error?.message ?? 'Password change failed');
    }
  },

  restoreSession: async () => {
    try {
      const [storedAccess, storedRefresh] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_KEY),
        SecureStore.getItemAsync(REFRESH_KEY),
      ]);

      if (!storedRefresh) return; // no session stored at all

      // Fast path: verify stored access token is still valid
      if (storedAccess) {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5_000);
        try {
          const res = await fetch(`${BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${storedAccess}` },
            signal: ctrl.signal,
          });
          clearTimeout(t);
          if (res.ok) {
            const { data } = await res.json() as { data: AuthUser };
            set({ token: storedAccess, user: data, isAuthenticated: true });
            return;
          }
        } catch {
          clearTimeout(t);
        }
      }

      // Access token missing or expired — exchange refresh token
      const ctrl2 = new AbortController();
      const t2 = setTimeout(() => ctrl2.abort(), 5_000);
      try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: storedRefresh }),
          signal: ctrl2.signal,
        });
        clearTimeout(t2);
        if (res.ok) {
          const { data } = await res.json() as LoginResponse;
          await SecureStore.setItemAsync(ACCESS_KEY, data.accessToken);
          await SecureStore.setItemAsync(REFRESH_KEY, data.refreshToken);
          set({ token: data.accessToken, refreshToken: data.refreshToken, user: data.user, isAuthenticated: true });
          return;
        }
      } catch {
        clearTimeout(t2);
      }

      // Both attempts failed — clear stored credentials
      await SecureStore.deleteItemAsync(ACCESS_KEY);
      await SecureStore.deleteItemAsync(REFRESH_KEY);
    } catch {
      set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
    }
  },
}));
