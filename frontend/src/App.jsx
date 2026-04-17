import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';

// ── Layout ────────────────────────────────────────────────────
const Layout = lazy(() => import('./components/layout/Layout'));

// ── Auth ──────────────────────────────────────────────────────
const Login    = lazy(() => import('./pages/auth/Login'));

// ── Pages générales ───────────────────────────────────────────
const Dashboard   = lazy(() => import('./pages/Dashboard'));
const NotFound    = lazy(() => import('./pages/NotFound'));
const Forbidden   = lazy(() => import('./pages/Forbidden'));

// ── Phase 1 : Catalogue ───────────────────────────────────────
const ProduitsList    = lazy(() => import('./pages/produits/ProduitsList'));
const ProduitsForm    = lazy(() => import('./pages/produits/ProduitsForm'));
const ProduitDetail   = lazy(() => import('./pages/produits/ProduitDetail'));
const ClientsList     = lazy(() => import('./pages/clients/ClientsList'));
const ClientsForm     = lazy(() => import('./pages/clients/ClientsForm'));
const ClientDetail    = lazy(() => import('./pages/clients/ClientDetail'));
const FournisseursList = lazy(() => import('./pages/fournisseurs/FournisseursList'));
const FournisseursForm = lazy(() => import('./pages/fournisseurs/FournisseursForm'));
const MarquesList     = lazy(() => import('./pages/marques/MarquesList'));
const MarquesForm     = lazy(() => import('./pages/marques/MarquesForm'));
const CategoriesList  = lazy(() => import('./pages/categories/CategoriesList'));

// ── Phase 2 : Commandes & Stock ───────────────────────────────
const CommandesList   = lazy(() => import('./pages/commandes/CommandesList'));
const CommandeDetail  = lazy(() => import('./pages/commandes/CommandeDetail'));
const StockMouvements = lazy(() => import('./pages/stock/StockMouvements'));

// ── Phase 3 : KPIs, Ads, Reçus ───────────────────────────────
const KpisPage   = lazy(() => import('./pages/kpis/KpisPage'));
const AdsPage    = lazy(() => import('./pages/ads/AdsPage'));
const RecuDetail      = lazy(() => import('./pages/recus/RecuDetail'));
const RecusList       = lazy(() => import('./pages/recus/RecusList'));

// ── Profil & Admin ────────────────────────────────────────────
const UserProfile     = lazy(() => import('./pages/profile/UserProfile'));
const UserStatsPage   = lazy(() => import('./pages/admin/UserStatsPage'));
const ProduitsArchives = lazy(() => import('./pages/produits/ProduitsArchives'));

// ── Phase 4 : Admin ───────────────────────────────────────────
const UsersAdmin  = lazy(() => import('./pages/admin/UsersAdmin'));
const AdminStats  = lazy(() => import('./pages/admin/AdminStats'));
const Settings    = lazy(() => import('./pages/settings/Settings'));

// ── Hiérarchie rôles ──────────────────────────────────────────
const ROLE_HIERARCHY = {
  superadmin:5, admin:4, manager:3, vendeur:2, lecteur:1,
};

// ── Spinner ───────────────────────────────────────────────────
const PageSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"/>
      <span className="text-sm text-gray-400">Chargement…</span>
    </div>
  </div>
);

// ── Guards ────────────────────────────────────────────────────
const RequireAuth = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const RoleGuard = ({ role }) => {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  const ok = (ROLE_HIERARCHY[user.role]||0) >= (ROLE_HIERARCHY[role]||0);
  return ok ? <Outlet /> : <Navigate to="/403" replace />;
};

const RedirectIfAuth = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
};

// ── App ───────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSpinner />}>
        <Routes>

          {/* Publiques */}
          <Route element={<RedirectIfAuth />}>
            <Route path="/login" element={<Login />} />
          </Route>

          {/* Protégées */}
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>

              {/* Dashboard — tous */}
              <Route index element={<Dashboard />} />

              {/* Profil — tous les utilisateurs */}
              <Route path="profile" element={<UserProfile />} />

              {/* Produits — lecture : tous, édition : manager+ */}
              <Route path="produits">
                <Route index           element={<ProduitsList />} />
                <Route path=":id"      element={<ProduitDetail />} />
                <Route path="archives" element={<ProduitsArchives />} />
                <Route element={<RoleGuard role="manager" />}>
                  <Route path="nouveau"  element={<ProduitsForm />} />
                  <Route path=":id/edit" element={<ProduitsForm />} />
                </Route>
              </Route>

              {/* Clients — vendeur+ */}
              <Route element={<RoleGuard role="vendeur" />}>
                <Route path="clients">
                  <Route index       element={<ClientsList />} />
                  <Route path=":id"  element={<ClientDetail />} />
                  <Route path="nouveau"   element={<ClientsForm />} />
                  <Route path=":id/edit"  element={<ClientsForm />} />
                </Route>

                {/* Commandes — vendeur+ */}
                <Route path="commandes">
                  <Route index      element={<CommandesList />} />
                  <Route path=":id" element={<CommandeDetail />} />
                </Route>

                {/* Reçus — vendeur+ */}
                <Route path="recus"            element={<RecusList />} />
                <Route path="recus/:commandeId" element={<RecuDetail />} />
              </Route>

              {/* Catalogue & stock — manager+ */}
              <Route element={<RoleGuard role="manager" />}>
                <Route path="fournisseurs">
                  <Route index          element={<FournisseursList />} />
                  <Route path="nouveau" element={<FournisseursForm />} />
                  <Route path=":id/edit" element={<FournisseursForm />} />
                </Route>

                <Route path="marques">
                  <Route index          element={<MarquesList />} />
                  <Route path="nouveau" element={<MarquesForm />} />
                  <Route path=":id/edit" element={<MarquesForm />} />
                </Route>

                <Route path="categories" element={<CategoriesList />} />

                <Route path="stock"  element={<StockMouvements />} />
                <Route path="kpis"   element={<KpisPage />} />
                <Route path="ads"    element={<AdsPage />} />
              </Route>

              {/* Admin — admin+ */}
              <Route element={<RoleGuard role="admin" />}>
                <Route path="settings"       element={<Settings />} />
                <Route path="admin/users"    element={<UsersAdmin />} />
                <Route element={<RoleGuard role="superadmin" />}>
                  <Route path="admin/stats"           element={<AdminStats />} />
                  <Route path="admin/users/:userId/stats" element={<UserStatsPage />} />
                </Route>
              </Route>

            </Route>
          </Route>

          {/* Erreurs */}
          <Route path="/403" element={<Forbidden />} />
          <Route path="*"    element={<NotFound />} />

        </Routes>
      </Suspense>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background:   '#fff',
            color:        '#111827',
            fontSize:     '14px',
            border:       '1px solid #e5e7eb',
            borderRadius: '10px',
            boxShadow:    '0 4px 12px rgba(0,0,0,0.08)',
          },
          success: { iconTheme:{ primary:'#16a34a', secondary:'#fff' } },
          error:   { iconTheme:{ primary:'#dc2626', secondary:'#fff' } },
        }}
      />
    </BrowserRouter>
  );
}
