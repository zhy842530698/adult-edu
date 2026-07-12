import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AdminInfo {
  id: number;
  username: string;
  display_name?: string;
  is_super_admin: boolean;
  permissions: string[];
}

interface AuthState {
  token: string | null;
  admin: AdminInfo | null;
  setAuth: (token: string, admin: AdminInfo) => void;
  logout: () => void;
  hasPerm: (code: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      admin: null,
      setAuth: (token, admin) => set({ token, admin }),
      logout: () => {
        set({ token: null, admin: null });
        localStorage.removeItem('admin-auth');
      },
      hasPerm: (code: string) => {
        const a = get().admin;
        if (!a) return false;
        if (a.is_super_admin) return true;
        return a.permissions?.includes(code) || false;
      },
    }),
    { name: 'admin-auth' }
  )
);