import { api } from '../utils/api';

export interface User {
  id: string;
  displayName: string;
  email: string;
  photos: { value: string }[];
  riskLevel?: 'Low' | 'Moderate' | 'High';
}

export const authService = {
  checkAuth: async (): Promise<User | null> => {
    try {
      const user = await api.get<User>('/user');
      return user;
    } catch (error) {
      return null;
    }
  },

  login: async (provider: 'google' | 'guest' = 'google'): Promise<void> => {
    if (provider === 'google') {
      window.location.href = '/auth/google';
    } else {
      // Guest login simulation
      localStorage.setItem('auth_token', 'guest-token');
    }
  },

  logout: async (): Promise<void> => {
    try {
      await api.get('/logout');
      localStorage.removeItem('auth_token');
    } catch (error) {
      console.error('Logout failed', error);
    }
  },
};
