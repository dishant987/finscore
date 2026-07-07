import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getMe, type UserResponse } from "@/api/auth";

interface AuthState {
  token: string | null;
  user: UserResponse | null;
  isLoading: boolean;
  isInitialized: boolean;
  setAuth: (token: string, user: UserResponse) => void;
  setUser: (user: UserResponse) => void;
  logout: () => void;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isLoading: false,
      isInitialized: false,
      setAuth: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
      initAuth: async () => {
        if (!get().token) {
          set({ isInitialized: true });
          return;
        }
        set({ isLoading: true });
        try {
          const user = await getMe();
          set({ user, isInitialized: true });
        } catch {
          set({ token: null, user: null, isInitialized: true });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    { name: "auth-storage", partialize: (s) => ({ token: s.token, user: s.user }) },
  ),
);
