import { create } from 'zustand';

interface AuthState {
  token: string | null;
  userId: string | null;
  role: string | null;
  setAuth: (token: string, userId: string, role: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  role: null,
  setAuth: (token, userId, role) => set({ token, userId, role }),
  clearAuth: () => set({ token: null, userId: null, role: null }),
}));
