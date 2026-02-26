// src/store.ts
import { create } from 'zustand';

interface AppState {
    apiSettings: {
        geminiKey: string;
    };
    setGeminiKey: (key: string) => void;
}

export const useStore = create<AppState>((set) => ({
    apiSettings: {
        geminiKey: typeof localStorage !== 'undefined' ? localStorage.getItem('gemini_api_key') || '' : '',
    },
    setGeminiKey: (key: string) => {
        if (typeof localStorage !== 'undefined') {
            if (key) localStorage.setItem('gemini_api_key', key);
            else localStorage.removeItem('gemini_api_key');
        }
        set((state) => ({ apiSettings: { ...state.apiSettings, geminiKey: key } }));
    },
}));
