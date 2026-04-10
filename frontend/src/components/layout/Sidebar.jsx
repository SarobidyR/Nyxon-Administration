import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, Truck, Tag, FolderOpen,
  ShoppingCart, Warehouse, BarChart3, Megaphone, Receipt,
  Settings, ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react';
import useUiStore    from '../../store/uiStore';
import useAuthStore  from '../../store/authStore';

// ── Définition du menu ────────────────────────────────────────
// role minimum requis : null = tout le monde, sinon vendeur/manager/admin/superadmin
const NAV_SECTIONS = [
  {
    label: 'Principal',
    items: [
      { to: '/',            label: 'Dashboard',     icon: LayoutDashboard, role: null      },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { to: '/produits',     label: 'Produits',      icon: Package,    role: null      },
      { to: '/categories',   label: 'Catégories',    icon: FolderOpen, role: 'manager' },
      { to: '/marques',      label: 'Marques',       icon: Tag,        role: 'manager' },
      { to: '/fournisseurs', label: 'Fournisseurs',  icon: Truck,      role: 'manager' },
    ],
  },
  {
    label: 'Ventes',
    items: [
      { to: '/commandes',    label: 'Commandes',     icon: ShoppingCart, role: 'vendeur' },
      { to: '/clients',      label: 'Clients',       icon: Users,        role: 'vendeur' },
    ],
  },
  {
    label: 'Stock',
    items: [
      { to: '/stock',        label: 'Mouvements',    icon: Warehouse,  role: 'manager' },
    ],
  },
  {
    label: 'Analytique',
    items: [
      { to: '/kpis',         label: 'KPIs',          icon: BarChart3,  role: 'manager' },
      { to: '/ads',          label: 'Ads Budget',    icon: Megaphone,  role: 'manager' },
      { to: '/recus',        label: 'Reçus',         icon: Receipt,    role: 'vendeur' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/settings',     label: 'Paramètres',    icon: Settings,   role: 'admin'   },
    ],
  },
];

// ── Hiérarchie rôles ──────────────────────────────────────────
const ROLE_HIERARCHY = { superadmin:5, admin:4, manager:3, vendeur:2, lecteur:1 };
const canAccess = (userRole, requiredRole) => {
  if (!requiredRole) return true;
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
};

// ── Composant item de navigation ──────────────────────────────
function NavItem({ to, label, icon: Icon, collapsed }) {
  const location = useLocation();
  // Actif exact sur '/', préfixe sinon
  const isActive = to === '/'
    ? location.pathname === '/'
    : location.pathname.startsWith(to);

  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={`
        group flex items-center gap-3 px-3 py-2 rounded-lg text-sm
        transition-all duration-150 select-none
        ${isActive
          ? 'bg-sky-500/10 text-sky-500 font-medium'
          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
        }
        ${collapsed ? 'justify-center' : ''}
      `}
    >
      <Icon
        className={`flex-shrink-0 transition-colors ${
          isActive ? 'text-sky-500' : 'text-gray-500 group-hover:text-gray-300'
        }`}
        size={18}
      />
      {!collapsed && (
        <span className="truncate">{label}</span>
      )}
      {/* Indicateur actif */}
      {isActive && !collapsed && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0" />
      )}
    </NavLink>
  );
}

// ── Sidebar ───────────────────────────────────────────────────
export default function Sidebar() {
  const sidebarOpen      = useUiStore((s) => s.sidebarOpen);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const collapseSidebar  = useUiStore((s) => s.collapseSidebar);
  const user             = useAuthStore((s) => s.user);
  const logout           = useAuthStore((s) => s.logout);

  const initiales = user
    ? `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase()
    : '?';

  return (
    <aside
      className={`
        fixed top-0 left-0 z-30 h-full
        bg-gray-900 border-r border-white/5
        flex flex-col
        transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'w-[72px]' : 'w-[240px]'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}
    >
      {/* ── Logo ─────────────────────────────────────────────── */}
      <div className={`
        flex items-center h-16 flex-shrink-0 border-b border-white/5 px-4
        ${sidebarCollapsed ? 'justify-center' : 'gap-3'}
      `}>
        <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-black text-white">N</span>
        </div>
        {!sidebarCollapsed && (
          <span className="text-white font-semibold text-base tracking-tight">
            Nyxon
          </span>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin">
        {NAV_SECTIONS.map((section) => {
          // Filtrer les items selon le rôle
          const visibleItems = section.items.filter(
            (item) => canAccess(user?.role, item.role)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label}>
              {/* Label de section */}
              {!sidebarCollapsed && (
                <p className="px-3 mb-2 text-[10px] font-semibold
                              uppercase tracking-widest text-gray-600">
                  {section.label}
                </p>
              )}
              {sidebarCollapsed && (
                <div className="mx-3 mb-2 border-t border-white/5" />
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <NavItem
                    key={item.to}
                    {...item}
                    collapsed={sidebarCollapsed}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Profil utilisateur ────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-white/5 p-3">
        <div className={`
          flex items-center gap-3 px-2 py-2 rounded-lg
          ${sidebarCollapsed ? 'justify-center' : ''}
        `}>
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-500/30
                          flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-sky-400">{initiales}</span>
          </div>

          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">
                {user?.prenom} {user?.nom}
              </p>
              <p className="text-xs text-gray-500 truncate capitalize">
                {user?.role}
              </p>
            </div>
          )}

          {/* Bouton déconnexion */}
          {!sidebarCollapsed && (
            <button
              onClick={() => logout()}
              title="Se déconnecter"
              className="p-1.5 rounded-lg text-gray-500 hover:text-red-400
                         hover:bg-red-400/10 transition-colors flex-shrink-0"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>

        {/* Déconnexion en mode réduit */}
        {sidebarCollapsed && (
          <button
            onClick={() => logout()}
            title="Se déconnecter"
            className="w-full mt-1 flex items-center justify-center p-2 rounded-lg
                       text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut size={15} />
          </button>
        )}
      </div>

      {/* ── Bouton collapse (desktop uniquement) ─────────────── */}
      <button
        onClick={collapseSidebar}
        className="
          hidden lg:flex absolute -right-3 top-20
          w-6 h-6 rounded-full
          bg-gray-800 border border-white/10
          items-center justify-center
          text-gray-400 hover:text-white
          transition-colors shadow-sm
        "
        title={sidebarCollapsed ? 'Déplier' : 'Réduire'}
      >
        {sidebarCollapsed
          ? <ChevronRight size={12} />
          : <ChevronLeft  size={12} />
        }
      </button>
    </aside>
  );
}
