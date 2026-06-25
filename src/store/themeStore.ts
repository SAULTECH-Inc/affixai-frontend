import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme-mode';

function readStored(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === 'light' || v === 'dark' || v === 'system') return v;
  return 'dark';
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const isDark = mode === 'dark' || (mode === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', isDark);
}

interface ThemeState {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  init: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: readStored(),

  setMode: (m) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, m);
    applyTheme(m);
    set({ mode: m });
  },

  init: () => {
    applyTheme(get().mode);
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', () => {
        if (get().mode === 'system') applyTheme('system');
      });
    }
  },
}));
