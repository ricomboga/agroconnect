import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { useFarmStore } from '../store/farm.store';

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
  mustSelectFarm: boolean;
  /** Password used at last login — held in memory only so SetPINScreen can call changePassword correctly */
  loginPassword: string | null;
  login: (credentials: { phone: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  resetPin: (phone: string, code: string, newPin: string) => Promise<void>;
  restoreSession: () => Promise<void>;
  completePinSetup: () => Promise<void>;
  completeOnboarding: () => void;
  completeFarmSelection: () => void;
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
  mustSelectFarm: false,
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
      set({ token: data.accessToken, refreshToken: data.refreshToken, user: data.user, isAuthenticated: true, isLoading: false, mustSetPin: pinDone === null, mustSelectFarm: true, loginPassword: credentials.password });
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
    useFarmStore.getState().clearActiveFarm();
    set({ token: null, refreshToken: null, user: null, isAuthenticated: false, mustSelectFarm: false });
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

  resetPin: async (phone, code, newPin) => {
    const res = await fetch(`${BASE_URL}/auth/password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code, new_password: newPin }),
    });
    if (!res.ok) {
      const text = await res.text();
      let errorCode: string | undefined;
      try {
        const body = JSON.parse(text) as { error_code?: string };
        errorCode = body.error_code;
      } catch { /* response was not JSON */ }
      const message =
        errorCode === 'OTP_INVALID' ? 'auth.resetPin.error.invalidCode'
        : errorCode === 'USER_NOT_FOUND' ? 'auth.error.invalidCredentials'
        : 'auth.error.loginFailed';
      throw new Error(message);
    }
    // A reset PIN counts as an already-completed setup — skip SetPINScreen on next login
    await SecureStore.setItemAsync(PIN_SETUP_KEY, '1');
  },

  completePinSetup: async () => {
    await SecureStore.setItemAsync(PIN_SETUP_KEY, '1');
    set({ mustSetPin: false, mustShowOnboarding: true, loginPassword: null });
  },

  completeOnboarding: () => {
    set({ mustShowOnboarding: false });
  },

  completeFarmSelection: () => {
    set({ mustSelectFarm: false });
  },

  restoreSession: async () => {
    // Sessions never persist across an app restart — the user must always log in
    // (and re-enter their PIN) after relaunching the app. Any tokens left over
    // from a previous run are discarded rather than silently re-authenticated.
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_KEY),
        SecureStore.deleteItemAsync(REFRESH_KEY),
      ]);
    } finally {
      set({ token: null, refreshToken: null, user: null, isAuthenticated: false, mustSetPin: false, mustShowOnboarding: false, mustSelectFarm: false });
    }
  },
}));
