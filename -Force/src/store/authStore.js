import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi, TokenStorage } from '../api/axios';

// ── Helpers ───────────────────────────────────────────────────
const decodeToken = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
};

const isTokenExpired = (token) => {
  const payload = decodeToken(token);
  if (!payload?.exp) return true;
  // Marge de 30 secondes
  return Date.now() >= (payload.exp - 30) * 1000;
};

// ── Store ─────────────────────────────────────────────────────
const useAuthStore = create(
  persist(
    (set, get) => ({
      // ── État ─────────────────────────────────────────────────
      user:         null,
      accessToken:  null,
      refreshToken: null,
      isLoading:    false,
      error:        null,

      // ── Getters ───────────────────────────────────────────────
      isAuthenticated: () => {
        const { accessToken } = get();
        return !!accessToken && !isTokenExpired(accessToken);
      },

      hasRole: (requiredRole) => {
        const { user } = get();
        if (!user) return false;
        const hierarchy = {
          superadmin: 5,
          admin:      4,
          manager:    3,
          vendeur:    2,
          lecteur:    1,
        };
        const userLevel     = hierarchy[user.role]     || 0;
        const requiredLevel = hierarchy[requiredRole]  || 0;
        return userLevel >= requiredLevel;
      },

      hasAnyRole: (roles) => {
        return roles.some((role) => get().hasRole(role));
      },

      // ── Actions ───────────────────────────────────────────────
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { data: res } = await authApi.login({ email, password });
          const { user, accessToken, refreshToken } = res.data;

          // Persister dans localStorage via TokenStorage
          TokenStorage.setTokens(accessToken, refreshToken);
          localStorage.setItem('user', JSON.stringify(user));

          set({
            user,
            accessToken,
            refreshToken,
            isLoading: false,
            error: null,
          });

          return { success: true };
        } catch (err) {
          const message = err.message || 'Identifiants incorrects';
          set({ isLoading: false, error: message });
          return { success: false, message };
        }
      },

      logout: async (silent = false) => {
        const { refreshToken } = get();
        // Appel API en best-effort (ne pas bloquer si ça échoue)
        if (!silent && refreshToken) {
          try {
            await authApi.logout({ refreshToken });
          } catch {
            // Ignorer l'erreur réseau lors du logout
          }
        }
        TokenStorage.clearTokens();
        set({ user: null, accessToken: null, refreshToken: null, error: null });
      },

      // Appelé par axios.js après un refresh réussi
      updateTokens: (accessToken, refreshToken) => {
        TokenStorage.setTokens(accessToken, refreshToken);
        set({ accessToken, refreshToken });
      },

      // Recharger le profil depuis l'API
      fetchMe: async () => {
        try {
          const { data: res } = await authApi.me();
          const user = res.data;
          localStorage.setItem('user', JSON.stringify(user));
          set({ user });
          return user;
        } catch {
          return null;
        }
      },

      clearError: () => set({ error: null }),

      setLoading: (isLoading) => set({ isLoading }),
    }),

    {
      name:    'nyxon-auth',           // clé localStorage
      storage: createJSONStorage(() => localStorage),
      // Ne persister que les données essentielles, pas isLoading/error
      partialize: (state) => ({
        user:         state.user,
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);

// ── Écouter les événements d'axios ────────────────────────────
// auth:logout  → déclenché par axios quand le refresh échoue
// auth:forbidden → déclenché sur une 403
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    useAuthStore.getState().logout(true); // silent = pas d'appel API
  });

  window.addEventListener('auth:forbidden', () => {
    // On peut afficher une notif, ici on laisse le composant gérer
    console.warn('[Auth] Accès refusé (403)');
  });
}

export default useAuthStore;