import { create } from 'zustand';

type ToastSeverity = 'info' | 'success' | 'warning' | 'error';

interface Toast {
  message: string;
  severity: ToastSeverity;
}

interface UiState {
  toast: Toast | null;
  showToast: (message: string, severity?: ToastSeverity) => void;
  clearToast: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  toast: null,
  showToast: (message, severity = 'info') => set({ toast: { message, severity } }),
  clearToast: () => set({ toast: null }),
}));
