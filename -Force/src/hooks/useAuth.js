import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

// ── Hook principal ────────────────────────────────────────────
// Usage dans un composant :
//   const { user, login, logout, isAuthenticated, hasRole } = useAuth();
const useAuth = () => {
  const store = useAuthStore();
  return {
    user:            store.user,
    isLoading:       store.isLoading,
    error:           store.error,
    isAuthenticated: store.isAuthenticated(),
    login:           store.login,
    logout:          store.logout,
    fetchMe:         store.fetchMe,
    updateTokens:    store.updateTokens,
    clearError:      store.clearError,
    hasRole:         store.hasRole,
    hasAnyRole:      store.hasAnyRole,
  };
};

// ── Hook de protection de route ───────────────────────────────
// Usage : useRequireAuth()  →  redirige vers /login si non connecté
// Usage : useRequireAuth('manager')  →  redirige vers /403 si rôle insuffisant
export const useRequireAuth = (requiredRole = null) => {
  const navigate        = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const hasRole         = useAuthStore((s) => s.hasRole);
  const user            = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (requiredRole && !hasRole(requiredRole)) {
      navigate('/403', { replace: true });
    }
  }, [isAuthenticated, requiredRole, navigate, hasRole]);

  return { user, isAuthenticated };
};

// ── Hook de redirection si déjà connecté ──────────────────────
// Usage sur la page Login : si déjà connecté → aller au dashboard
export const useRedirectIfAuthenticated = (to = '/') => {
  const navigate        = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  useEffect(() => {
    if (isAuthenticated) {
      navigate(to, { replace: true });
    }
  }, [isAuthenticated, navigate, to]);
};

export default useAuth;