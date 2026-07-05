import { create } from 'zustand';

interface FarmStoreState {
  activeFarmId: string | null;
  setActiveFarmId: (id: string | null) => void;
  clearActiveFarm: () => void;
}

export const useFarmStore = create<FarmStoreState>((set) => ({
  activeFarmId: null,
  setActiveFarmId: (id) => set({ activeFarmId: id }),
  clearActiveFarm: () => set({ activeFarmId: null }),
}));
