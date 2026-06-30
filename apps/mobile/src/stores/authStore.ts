import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_KEY = 'auth_access_token';
const REFRESH_KEY = 'auth_refresh_token';
const BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';

export interface AuthUser {
  id: string;
  fullName: string;
  phone: string;
  role: string;
  county?: string | null;
  workerRole?: string | null;
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
  mustSetPin: boolean;
  mustShowOnboarding: boolean;
  /** Password used at last login — held in memory only so SetPINScreen can call changePassword correctly */
  loginPassword: string | null;
  login: (credentials: { phone: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  restoreSession: () => Promise<void>;
  completePinSetup: () => Promise<void>;
  completeOnboarding: () => void;
}

const PIN_SETUP_KEY = 'pin_setup_done';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isLoading: false,
  isAuthenticated: false,
  mustSetPin: false,
  mustShowOnboarding: false,
  loginPassword: null,

  login: async (credentials) => {
    set({ isLoading: true });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const text = await res.text();
      type AuthErrorBody = {
        error?: { message?: string; code?: string };
        error_code?: string;
        message_key?: string;
      };
      let body: LoginResponse & AuthErrorBody;
      try {
        body = JSON.parse(text) as LoginResponse & AuthErrorBody;
      } catch {
        throw new Error(res.ok ? 'Unexpected server response' : `Server error ${res.status}`);
      }
      if (!res.ok) {
        const serverMsg = body.error?.message;
        const errorCode = body.error?.code ?? body.error_code;
        let localMsg = serverMsg;
        if (!localMsg) {
          if (errorCode === 'INVALID_CREDENTIALS') localMsg = 'auth.error.invalidCredentials';
          else if (errorCode === 'PHONE_TAKEN') localMsg = 'auth.error.phoneTaken';
          else localMsg = body.message_key ?? 'auth.error.loginFailed';
        }
        throw new Error(localMsg);
      }
      const { data } = body;
      await SecureStore.setItemAsync(ACCESS_KEY, data.accessToken);
      await SecureStore.setItemAsync(REFRESH_KEY, data.refreshToken);
      const pinDone = await SecureStore.getItemAsync(PIN_SETUP_KEY);
      set({ token: data.accessToken, refreshToken: data.refreshToken, user: data.user, isAuthenticated: true, isLoading: false, mustSetPin: pinDone === null, loginPassword: credentials.password });
    } catch (err) {
      clearTimeout(timer);
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
      const text = await res.text();
      let message = 'Password change failed';
      try {
        const body = JSON.parse(text) as { error?: { message?: string } };
        message = body.error?.message ?? message;
      } catch { /* response was not JSON */ }
      throw new Error(message);
    }
  },

  completePinSetup: async () => {
    await SecureStore.setItemAsync(PIN_SETUP_KEY, '1');
    set({ mustSetPin: false, mustShowOnboarding: true, loginPassword: null });
  },

  completeOnboarding: () => {
    set({ mustShowOnboarding: false });
  },

  restoreSession: async () => {
    try {
      const [storedAccess, storedRefresh, pinDone, onboardingDone] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_KEY),
        SecureStore.getItemAsync(REFRESH_KEY),
        SecureStore.getItemAsync(PIN_SETUP_KEY),
        AsyncStorage.getItem('onboarding_complete'),
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
            set({ token: storedAccess, user: data, isAuthenticated: true, mustSetPin: pinDone === null, mustShowOnboarding: onboardingDone === null && pinDone !== null });
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
          const { data } = await res.json() as { data: { accessToken: string; refreshToken: string } };
          await SecureStore.setItemAsync(ACCESS_KEY, data.accessToken);
          await SecureStore.setItemAsync(REFRESH_KEY, data.refreshToken);
          // Fetch user separately — the refresh endpoint only returns tokens
          const ctrl3 = new AbortController();
          const t3 = setTimeout(() => ctrl3.abort(), 5_000);
          try {
            const meRes = await fetch(`${BASE_URL}/auth/me`, {
              headers: { Authorization: `Bearer ${data.accessToken}` },
              signal: ctrl3.signal,
            });
            clearTimeout(t3);
            if (meRes.ok) {
              const { data: user } = await meRes.json() as { data: AuthUser };
              set({ token: data.accessToken, refreshToken: data.refreshToken, user, isAuthenticated: true, mustSetPin: pinDone === null, mustShowOnboarding: onboardingDone === null && pinDone !== null });
              return;
            }
          } catch {
            clearTimeout(t3);
          }
          // /auth/me failed after refresh — clear session
          await SecureStore.deleteItemAsync(ACCESS_KEY);
          await SecureStore.deleteItemAsync(REFRESH_KEY);
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
