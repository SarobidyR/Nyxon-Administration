import axios from 'axios';

// ── Instance principale ───────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Stockage tokens (en mémoire + localStorage) ───────────────
const TokenStorage = {
  getAccess:   ()      => localStorage.getItem('accessToken'),
  getRefresh:  ()      => localStorage.getItem('refreshToken'),
  setTokens:   (a, r)  => {
    localStorage.setItem('accessToken',  a);
    localStorage.setItem('refreshToken', r);
  },
  clearTokens: ()      => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },
};

// ── File d'attente pendant le refresh ─────────────────────────
// Si plusieurs requêtes échouent en même temps (401), on ne fait
// qu'un seul appel /refresh et on réessaie toutes les requêtes
// en attente une fois le nouveau token obtenu.
let isRefreshing  = false;
let failedQueue   = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

// ── Intercepteur REQUEST — injecter le Bearer token ──────────
api.interceptors.request.use(
  (config) => {
    const token = TokenStorage.getAccess();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Intercepteur RESPONSE — gérer l'expiration du token ──────
api.interceptors.response.use(
  // Réponse OK : extraire directement data.data si présent
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // Si pas de réponse serveur (réseau coupé, timeout)
    if (!error.response) {
      return Promise.reject({
        message: 'Impossible de joindre le serveur. Vérifiez votre connexion.',
        network: true,
      });
    }

    const { status } = error.response;

    // ── 401 : token expiré → tenter le refresh ────────────────
    if (status === 401 && !originalRequest._retry) {
      const refreshToken = TokenStorage.getRefresh();

      // Pas de refresh token → déconnecter directement
      if (!refreshToken) {
        TokenStorage.clearTokens();
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(error);
      }

      // Si un refresh est déjà en cours, mettre en file d'attente
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return api(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      // Lancer le refresh
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
          { refreshToken }
        );

        const { accessToken, refreshToken: newRefresh } = data.data;
        TokenStorage.setTokens(accessToken, newRefresh);

        // Mettre à jour le header par défaut
        api.defaults.headers['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;

        // Débloquer la file d'attente
        processQueue(null, accessToken);

        return api(originalRequest);

      } catch (refreshError) {
        // Refresh échoué → déconnecter
        processQueue(refreshError, null);
        TokenStorage.clearTokens();
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(refreshError);

      } finally {
        isRefreshing = false;
      }
    }

    // ── 403 : accès refusé ────────────────────────────────────
    if (status === 403) {
      window.dispatchEvent(new CustomEvent('auth:forbidden'));
    }

    // ── Normaliser le message d'erreur ────────────────────────
    const message =
      error.response?.data?.message ||
      error.response?.data?.error   ||
      `Erreur ${status}`;

    const normalizedError = {
      message,
      status,
      errors:  error.response?.data?.errors || [],
      data:    error.response?.data,
      _raw:    error,
    };

    return Promise.reject(normalizedError);
  }
);

// ── Helpers par ressource ─────────────────────────────────────
// Évite de répéter api.get('/produits'), api.post('/produits')...
// Utilisation : apiResource('produits').getAll({ search: 'nike' })

export const apiResource = (resource) => ({
  getAll:   (params)     => api.get(`/${resource}`, { params }),
  getOne:   (id)         => api.get(`/${resource}/${id}`),
  create:   (body)       => api.post(`/${resource}`, body),
  update:   (id, body)   => api.put(`/${resource}/${id}`, body),
  patch:    (id, body)   => api.patch(`/${resource}/${id}`, body),
  remove:   (id)         => api.delete(`/${resource}/${id}`),
});

// ── API Auth ──────────────────────────────────────────────────
export const authApi = {
  login:          (body)  => api.post('/auth/login', body),
  register:       (body)  => api.post('/auth/register', body),
  logout:         (body)  => api.post('/auth/logout', body),
  refresh:        (body)  => api.post('/auth/refresh', body),
  me:             ()      => api.get('/auth/me'),
  changePassword: (body)  => api.patch('/auth/change-password', body),
};

// ── API Produits ──────────────────────────────────────────────
export const produitsApi = {
  ...apiResource('produits'),
  getAlertes: ()           => api.get('/produits/alertes'),
  updateStatut: (id, statut) => api.patch(`/produits/${id}/statut`, { statut }),
};

// ── API Clients ───────────────────────────────────────────────
export const clientsApi = {
  ...apiResource('clients'),
  getTop: (limit = 10) => api.get('/clients/top', { params: { limit } }),
};

// ── API Fournisseurs ──────────────────────────────────────────
export const fournisseursApi = apiResource('fournisseurs');

// ── API Marques ───────────────────────────────────────────────
export const marquesApi = {
  ...apiResource('marques'),
  toggleActif: (id, actif) => api.patch(`/marques/${id}/statut`, { actif }),
};

// ── API Catégories ────────────────────────────────────────────
export const categoriesApi = {
  ...apiResource('categories'),
  getTree:      ()              => api.get('/categories/tree'),
  updateOrdre:  (id, ordre)     => api.patch(`/categories/${id}/ordre`, { ordre }),
};

// ── API KPIS ────────────────────────────────────────────
export const kpisApi = {
  dashboard: () => api.get('/kpis/dashboard'),
};

// ── TokenStorage exposé pour le store Zustand ─────────────────
export { TokenStorage };

export default api;