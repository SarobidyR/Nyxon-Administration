import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      accessToken: null,
      user: null,

      // 🔐 set token
      setAccessToken: (token) => set({ accessToken: token }),

      // 👤 set user (optionnel mais utile)
      setUser: (user) => set({ user }),

      // 🔑 login
      login: (data) => {
        set({
          accessToken: data.accessToken,
          user: data.user,
        });
      },

      // 🚪 logout
      logout: () => {
        set({
          accessToken: null,
          user: null,
        });
      },
    }),
    {
      name: "auth-storage", // localStorage key
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
      }),
    }
  )
);