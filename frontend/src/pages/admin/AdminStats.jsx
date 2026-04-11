import { useEffect, useState } from 'react';
import {
  Users, Package, ShoppingCart, Warehouse,
  ShieldCheck, Shield, User, RefreshCw, Activity,
} from 'lucide-react';
import api        from '../../api/axios';
import useUiStore from '../../store/uiStore';
import toast      from 'react-hot-toast';

const StatCard = ({ label, value, icon:Icon, color, loading }) => {
  const colors = {
    sky:    'bg-sky-50   text-sky-600',
    green:  'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber:  'bg-amber-50 text-amber-600',
    red:    'bg-red-50   text-red-600',
    gray:   'bg-gray-100 text-gray-600',
  };
  return (
    <div className="card p-5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colors[color]||colors.sky}`}>
        <Icon size={18} />
      </div>
      {loading
        ? <div className="h-7 w-16 bg-gray-100 rounded animate-pulse mb-1"/>
        : <p className="text-2xl font-bold text-gray-900">{value}</p>
      }
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
};

export default function AdminStats() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setPageTitle('Administration — Statistiques'); }, [setPageTitle]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/admin/stats');
      setStats(res.data);
    } catch (err) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchStats(); }, []);

  const u = stats?.users    || {};
  const a = stats?.activite || {};

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h2 className="page-title">Vue système</h2>
          <p className="page-subtitle">Statistiques globales de l'application</p>
        </div>
        <button onClick={fetchStats} className="btn-secondary px-3">
          <RefreshCw size={15} className={loading?'animate-spin':''} />
        </button>
      </div>

      {/* Activité */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Activité</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Commandes (30j)"        value={a.cmds_30j   ?? '—'} icon={ShoppingCart} color="sky"    loading={loading}/>
          <StatCard label="Produits catalogue"      value={a.nb_produits ?? '—'} icon={Package}     color="green"  loading={loading}/>
          <StatCard label="Clients enregistrés"     value={a.nb_clients  ?? '—'} icon={Users}       color="purple" loading={loading}/>
          <StatCard label="Mvts stock (30j)"        value={a.mvts_30j   ?? '—'} icon={Warehouse}   color="amber"  loading={loading}/>
        </div>
      </div>

      {/* Utilisateurs */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Utilisateurs</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total comptes"   value={u.total    ?? '—'} icon={Users}       color="sky"    loading={loading}/>
          <StatCard label="Comptes actifs"  value={u.actifs   ?? '—'} icon={Activity}    color="green"  loading={loading}/>
          <StatCard label="Actifs (7j)"     value={u.actifs_7j?? '—'} icon={Activity}    color="sky"    loading={loading}/>
          <StatCard label="Suspendus"       value={u.suspendus?? '—'} icon={User}        color="red"    loading={loading}/>
        </div>
      </div>

      {/* Répartition rôles */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <ShieldCheck size={15} className="text-sky-500"/> Répartition par rôle
          </h3>
        </div>
        <div className="card-body">
          {loading ? <div className="h-24 bg-gray-50 rounded animate-pulse"/> : (
            <div className="space-y-3">
              {[
                { label:'Super Admin', key:'superadmins', color:'bg-purple-500', cls:'text-purple-700' },
                { label:'Admin',       key:'admins',      color:'bg-sky-500',    cls:'text-sky-700'    },
                { label:'Manager',     key:'managers',    color:'bg-green-500',  cls:'text-green-700'  },
                { label:'Vendeur',     key:'vendeurs',    color:'bg-amber-500',  cls:'text-amber-700'  },
                { label:'Lecteur',     key:'lecteurs',    color:'bg-gray-400',   cls:'text-gray-600'   },
              ].map(({ label, key, color, cls }) => {
                const val = parseInt(u[key]||0);
                const tot = parseInt(u.total||1);
                const pct = Math.round((val/tot)*100);
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className={`text-sm font-medium w-28 flex-shrink-0 ${cls}`}>{label}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${color}`} style={{width:`${pct}%`}}/>
                    </div>
                    <span className="text-sm text-gray-600 w-16 text-right flex-shrink-0">
                      {val} <span className="text-gray-400">({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
