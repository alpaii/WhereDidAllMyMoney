import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';
import type { User, LoginRequest, RegisterRequest, TokenResponse } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (data: LoginRequest) => {
        set({ isLoading: true });
        try {
          const response = await api.post<TokenResponse>('/auth/login', {
            email: data.email,
            password: data.password,
          });

          localStorage.setItem('access_token', response.data.access_token);
          localStorage.setItem('refresh_token', response.data.refresh_token);

          const userResponse = await api.get<User>('/auth/me');
          set({ user: userResponse.data, isAuthenticated: true });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (data: RegisterRequest) => {
        set({ isLoading: true });
        try {
          await api.post('/auth/register', data);
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, isAuthenticated: false });
      },

      fetchUser: async () => {
        const token = localStorage.getItem('access_token');
        if (!token) {
          set({ user: null, isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        try {
          const response = await api.get<User>('/auth/me');
          set({ user: response.data, isAuthenticated: true });
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          set({ user: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
