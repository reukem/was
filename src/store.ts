import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  apiSettings: {
    geminiKey: string | null;
  };
  setGeminiKey: (key: string | null) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      apiSettings: {
        geminiKey: null,
      },
      setGeminiKey: (key) =>
        set((state) => ({
          apiSettings: { ...state.apiSettings, geminiKey: key },
        })),
    }),
    {
      name: 'chemic-ai-storage',
      partialize: (state) => ({ apiSettings: state.apiSettings }),
    }
  )
);
