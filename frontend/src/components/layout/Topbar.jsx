import { useState, useRef, useEffect } from 'react';
import { useNavigate }  from 'react-router-dom';
import {
  Menu, Bell, ChevronDown, User, KeyRound,
  LogOut, AlertTriangle,
} from 'lucide-react';
import useUiStore   from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import { produitsApi } from '../../api/axios';

// ── Badge rôle ────────────────────────────────────────────────
const ROLE_COLORS = {
  superadmin: 'badge-purple',
  admin:      'badge-sky',
  manager:    'badge-green',
  vendeur:    'badge-amber',
  lecteur:    'badge-gray',
};

// ── Dropdown user menu ────────────────────────────────────────
function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref             = useRef(null);
  const navigate        = useNavigate();

  // Fermer en cliquant dehors
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initiales = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg
                   hover:bg-gray-100 transition-colors"
      >
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-sky-500/15 border border-sky-500/30
                        flex items-center justify-center">
          <span className="text-xs font-semibold text-sky-600">{initiales}</span>
        </div>

        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-gray-800 leading-none">
            {user?.prenom} {user?.nom}
          </p>
          <span className={`badge mt-0.5 ${ROLE_COLORS[user?.role] || 'badge-gray'}`}>
            {user?.role}
          </span>
        </div>

        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="
          absolute right-0 top-full mt-2 w-52
          bg-white rounded-xl border border-gray-200
          shadow-lg shadow-gray-200/60 py-1 z-50
          animate-in fade-in slide-in-from-top-2 duration-150
        ">
          {/* Info utilisateur */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.prenom} {user?.nom}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>

          {/* Actions */}
          <button
            onClick={() => { navigate('/profile'); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                       text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <User size={15} className="text-gray-400" />
            Mon profil
          </button>

          <button
            onClick={() => { navigate('/settings/password'); setOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                       text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <KeyRound size={15} className="text-gray-400" />
            Changer le mot de passe
          </button>

          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={() => { onLogout(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                         text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={15} />
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dropdown alertes stock ────────────────────────────────────
function AlertesStock() {
  const [open,    setOpen]    = useState(false);
  const [alertes, setAlertes] = useState([]);
  const ref                   = useRef(null);

  useEffect(() => {
    produitsApi.getAlertes()
      .then(({ data: res }) => setAlertes(res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const ruptures = alertes.filter((a) => a.etat_stock === 'rupture');
  const total    = alertes.length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-gray-500
                   hover:bg-gray-100 hover:text-gray-700 transition-colors"
        title="Alertes stock"
      >
        <Bell size={18} />
        {total > 0 && (
          <span className="
            absolute top-1 right-1 w-4 h-4 rounded-full
            bg-red-500 text-white text-[9px] font-bold
            flex items-center justify-center
          ">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="
          absolute right-0 top-full mt-2 w-72
          bg-white rounded-xl border border-gray-200
          shadow-lg shadow-gray-200/60 z-50
          animate-in fade-in slide-in-from-top-2 duration-150
        ">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-500" />
              <span className="text-sm font-semibold text-gray-800">
                Alertes stock
              </span>
            </div>
            {total > 0 && (
              <span className="badge badge-red">{total}</span>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            {total === 0 ? (
              <p className="px-4 py-6 text-sm text-center text-gray-400">
                Aucune alerte
              </p>
            ) : (
              alertes.map((a) => (
                <div
                  key={a.id}
                  className="px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {a.nom}
                    </p>
                    <span className={`badge flex-shrink-0 ${
                      a.etat_stock === 'rupture' ? 'badge-red' : 'badge-amber'
                    }`}>
                      {a.etat_stock === 'rupture' ? 'Rupture' : 'Alerte'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Stock : <span className="font-medium">{a.stock_actuel}</span>
                    {' '}/ min. {a.stock_minimum}
                  </p>
                </div>
              ))
            )}
          </div>

          {total > 0 && (
            <div className="border-t border-gray-100 px-4 py-2.5">
              <button
                onClick={() => { setOpen(false); }}
                className="text-xs text-sky-600 hover:text-sky-700 font-medium"
              >
                Voir tous les produits →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Topbar ────────────────────────────────────────────────────
export default function Topbar() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const pageTitle     = useUiStore((s) => s.pageTitle);
  const user          = useAuthStore((s) => s.user);
  const logout        = useAuthStore((s) => s.logout);

  return (
    <header className="
      h-16 flex-shrink-0 flex items-center justify-between
      px-4 sm:px-6
      bg-white border-b border-gray-200
      z-10
    ">
      {/* Gauche */}
      <div className="flex items-center gap-3">
        {/* Burger menu — mobile */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-lg text-gray-500
                     hover:bg-gray-100 transition-colors"
        >
          <Menu size={20} />
        </button>

        {/* Titre de la page courante */}
        <h1 className="text-base font-semibold text-gray-800 hidden sm:block">
          {pageTitle}
        </h1>
      </div>

      {/* Droite */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Alertes stock */}
        <AlertesStock />

        {/* Séparateur */}
        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* User menu */}
        <UserMenu user={user} onLogout={logout} />
      </div>
    </header>
  );
}
