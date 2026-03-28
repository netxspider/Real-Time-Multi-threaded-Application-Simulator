// src/store/navStore.js
import { create } from 'zustand';

export const useNavStore = create((set) => ({
  page: 'simulator', // 'simulator' | 'sync'
  goTo: (page) => set({ page }),
}));
