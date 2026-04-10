import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';

// ── Layout ────────────────────────────────────────────────────
const Layout = lazy(() => import('./components/layout/Layout'));

// ── Pages Auth ────────────────────────────────────────────────
const Login    = lazy(() => import('./pages/auth/Login'));

// ── Pages principales ─────────────────────────────────────────
const Dashboard      = lazy(() => import('./pages/Dashboard'));
const NotFound       = lazy(() => import('./pages/NotFound'));
const Forbidden      = lazy(() => import('./pages/Forbidden'));

// ── Produits ──────────────────────────────────────────────────
const ProduitsList   = lazy(() => import('./pages/produits/ProduitsList'));
const ProduitsForm   = lazy(() => import('./pages/produits/ProduitsForm'));
const ProduitDetail  = lazy(() => import('./pages/produits/ProduitDetail'));

// ── Clients ───────────────────────────────────────────────────
const ClientsList    = lazy(() => import('./pages/clients/ClientsList'));
const ClientsForm    = lazy(() => import('./pages/clients/ClientsForm'));
const ClientDetail   = lazy(() => import('./pages/clients/ClientDetail'));

// ── Fournisseurs ──────────────────────────────────────────────
const FournisseursList = lazy(() => import('./pages/fournisseurs/FournisseursList'));
const FournisseursForm = lazy(() => import('./pages/fournisseurs/FournisseursForm'));

// ── Marques ───────────────────────────────────────────────────
const MarquesList    = lazy(() => import('./pages/marques/MarquesList'));
const MarquesForm    = lazy(() => import('./pages/marques/MarquesForm'));

// ── Catégories ────────────────────────────────────────────────
const CategoriesList = lazy(() => import('./pages/categories/CategoriesList'));

// ── Commandes ────────────────────────────────────────────────
const CommandesList = lazy(()=> import('./pages/commandes/CommandesList'));
const CommandeDetail = lazy(()=> import('./pages/commandes/CommandesDetail'));

// ── Stock ────────────────────────────────────────────────
const StockMouvements = lazy(()=> import('./pages/stock/StockMouvements'));

// ── Hiérarchie des rôles (même ordre que le backend) ─────────
const ROLE_HIERARCHY = {
  superadmin: 5,
  admin:      4,
  manager:    3,
  vendeur:    2,
  lecteur:    1,
};

// ── Spinner de chargement lazy ────────────────────────────────
const PageSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-gray-500">Chargement…</span>
    </div>
  </div>
);

// ── Guard : utilisateur authentifié ──────────────────────────
// Redirige vers /login si pas de token valide
const RequireAuth = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

// ── Guard : rôle minimum requis ───────────────────────────────
// Usage : <RoleGuard role="manager" />
// Redirige vers /403 si rôle insuffisant
const RoleGuard = ({ role }) => {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;

  const userLevel     = ROLE_HIERARCHY[user.role]  || 0;
  const requiredLevel = ROLE_HIERARCHY[role]        || 0;

  if (userLevel < requiredLevel) {
    return <Navigate to="/403" replace />;
  }
  return <Outlet />;
};

// ── Guard : rediriger si déjà connecté ───────────────────────
// Sur la page Login : si déjà auth → aller au dashboard
const RedirectIfAuth = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};

// ── App ───────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSpinner />}>
        <Routes>

          {/* ── Routes publiques ── */}
          <Route element={<RedirectIfAuth />}>
            <Route path="/login" element={<Login />} />
          </Route>

          {/* ── Routes protégées (auth requise) ── */}
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>

              {/* Dashboard */}
              <Route index element={<Dashboard />} />

              {/* Produits — accès lecteur+ */}
              <Route path="produits">
                <Route index         element={<ProduitsList />} />
                <Route path=":id"    element={<ProduitDetail />} />
                {/* Création/édition → manager+ */}
                <Route element={<RoleGuard role="manager" />}>
                  <Route path="nouveau"   element={<ProduitsForm />} />
                  <Route path=":id/edit"  element={<ProduitsForm />} />
                </Route>
              </Route>

              {/* Clients — accès vendeur+ */}
              <Route element={<RoleGuard role="vendeur" />}>
                <Route path="clients">
                  <Route index            element={<ClientsList />} />
                  <Route path=":id"       element={<ClientDetail />} />
                  <Route path="nouveau"   element={<ClientsForm />} />
                  <Route path=":id/edit"  element={<ClientsForm />} />
                </Route>
              </Route>

              {/* Fournisseurs — manager+ */}
              <Route element={<RoleGuard role="manager" />}>
                <Route path="fournisseurs">
                  <Route index            element={<FournisseursList />} />
                  <Route path="nouveau"   element={<FournisseursForm />} />
                  <Route path=":id/edit"  element={<FournisseursForm />} />
                </Route>

                {/* Marques */}
                <Route path="marques">
                  <Route index            element={<MarquesList />} />
                  <Route path="nouveau"   element={<MarquesForm />} />
                  <Route path=":id/edit"  element={<MarquesForm />} />
                </Route>

                {/* Catégories */}
                <Route path="categories">
                  <Route index            element={<CategoriesList />} />
                </Route>
                </Route>

                {/* Commandes */}
                <Route element={<RoleGuard role="manager" />}>
                  <Route path="commandes">
                    <Route index       element={<CommandesList />} />
                    <Route path=":id"  element={<CommandeDetail />} />
                  </Route>
                </Route>

                  {/* Stock */}
                <Route element={<RoleGuard role="manager" />}>
                  <Route path="stock" element={<StockMouvements />} />
                </Route>
            </Route>{/* fin Layout */}
          </Route>{/* fin RequireAuth */}

          {/* ── Pages d'erreur ── */}
          <Route path="/403" element={<Forbidden />} />
          <Route path="*"    element={<NotFound />} />

        </Routes>
      </Suspense>

      {/* Toaster global react-hot-toast */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color:       '#111827',
            fontSize:    '14px',
            border:      '1px solid #e5e7eb',
            borderRadius: '10px',
            boxShadow:   '0 4px 12px rgba(0,0,0,0.08)',
          },
          success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />
    </BrowserRouter>
  );
}
