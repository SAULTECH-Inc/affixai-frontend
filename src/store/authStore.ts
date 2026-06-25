import { create } from 'zustand';
import { api, apiClient } from '@/lib/api';
import type {
  User,
  AuthResponse,
  LoginCredentials,
  RegisterData,
} from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (c: LoginCredentials) => Promise<void>;
  register: (d: RegisterData) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (credentials) => {
    const { data } = await api.post<AuthResponse>('/auth/login', credentials);
    apiClient.setTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    set({ user: data.user, isAuthenticated: true, isLoading: false });
  },

  register: async (registerData) => {
    const { data } = await api.post<AuthResponse>(
      '/auth/register',
      registerData
    );
    apiClient.setTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    set({ user: data.user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    apiClient.clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    try {
      const { data } = await api.get<User>('/users/profile');
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      apiClient.clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateUser: async (updates) => {
    const { data } = await api.put<User>('/users/profile', updates);
    set({ user: data });
  },
}));
