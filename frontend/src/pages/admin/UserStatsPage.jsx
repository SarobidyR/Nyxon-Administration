import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ShoppingCart, Warehouse,
  TrendingUp, Clock, Shield, User,
} from 'lucide-react';
import api          from '../../api/axios';
import useUiStore   from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import toast        from 'react-hot-toast';

const ROLE_CONFIG = {
  superadmin: { label:'Super Admin', cls:'bg-purple-100 text-purple-700' },
  admin:      { label:'Admin',       cls:'bg-sky-100    text-sky-700'    },
  manager:    { label:'Manager',     cls:'bg-green-100  text-green-700'  },
  vendeur:    { label:'Vendeur',     cls:'bg-amber-100  text-amber-700'  },
  lecteur:    { label:'Lecteur',     cls:'bg-gray-100   text-gray-600'   },
};

// ── Mini bar chart activité 30j ───────────────────────────────
function ActivityChart({ data }) {
  if (!data?.length) return (
    <p className="text-sm text-gray-400 text-center py-6">Aucune activité ces 30 derniers jours</p>
  );

  // Remplir les jours manquants
  const filled = [];
  const end  = new Date();
  const start = new Date(); start.setDate(end.getDate() - 29);
  const map   = Object.fromEntries(data.map((d) => [d.jour.slice(0,10), parseInt(d.nb)]));

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0,10);
    filled.push({ jour: key, nb: map[key] || 0 });
  }

  const max = Math.max(...filled.map((d) => d.nb), 1);

  return (
    <div className="flex items-end gap-0.5 h-16">
      {filled.map((d) => (
        <div key={d.jour} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.jour} : ${d.nb} commande(s)`}>
          <div className="w-full bg-gray-100 rounded-sm" style={{ height:'48px' }}>
            <div className="w-full bg-sky-400 rounded-sm transition-all"
              style={{ height:`${(d.nb/max)*100}%`, minHeight: d.nb>0?'2px':'0' }}/>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, icon:Icon, color, loading }) {
  const colors = { sky:'text-sky-600 bg-sky-50', green:'text-green-600 bg-green-50',
    purple:'text-purple-600 bg-purple-50', amber:'text-amber-600 bg-amber-50' };
  return (
    <div className="card p-5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colors[color]||colors.sky}`}>
        <Icon size={16}/>
      </div>
      {loading ? <div className="h-7 w-20 bg-gray-100 rounded animate-pulse mb-1"/> : (
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      )}
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

export default function UserStatsPage() {
  const { userId }   = useParams();
  const navigate     = useNavigate();
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const isSuperAdmin = useAuthStore((s) => s.hasRole('superadmin'));

  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setPageTitle('Stats utilisateur'); }, [setPageTitle]);

  // Protection côté client
  useEffect(() => {
    if (!isSuperAdmin) {
      toast.error('Accès réservé aux super admins');
      navigate('/403');
    }
  }, [isSuperAdmin, navigate]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    api.get(`/admin/users/${userId}/stats`)
      .then(({ data: res }) => setStats(res.data))
      .catch((err) => { toast.error(err.message || 'Introuvable'); navigate('/admin/users'); })
      .finally(() => setLoading(false));
  }, [userId, isSuperAdmin, navigate]);

  if (!isSuperAdmin) return null;
  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );
  if (!stats) return null;

  const { user, commandes, mouvements_stock, activite_30j } = stats;
  const initiales = `${user.prenom?.[0]||''}${user.nom?.[0]||''}`.toUpperCase();
  const roleConf  = ROLE_CONFIG[user.role] || ROLE_CONFIG.lecteur;
  const fmtAr     = (v) => Number(v||0).toLocaleString('fr-MG',{maximumFractionDigits:0});

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/users')} className="btn-ghost p-2">
            <ArrowLeft size={18}/>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-semibold flex-shrink-0">
              {initiales}
            </div>
            <div>
              <h2 className="page-title">{user.prenom} {user.nom}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`badge text-xs ${roleConf.cls}`}>
                  <Shield size={10} className="inline mr-1"/>{roleConf.label}
                </span>
                <span className={`badge ${user.statut==='actif'?'badge-green':'badge-red'}`}>
                  {user.statut}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 flex items-center gap-2">
          <Shield size={13} className="text-amber-600"/>
          <span className="text-xs text-amber-700 font-medium">Vue superadmin uniquement</span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Commandes créées"     value={commandes.total}  icon={ShoppingCart} color="sky"    loading={loading}/>
        <StatCard label="Commandes actives"    value={commandes.actives} icon={TrendingUp}   color="green"  loading={loading}/>
        <StatCard label="CA généré"            value={`${fmtAr(commandes.ca_total)} Ar`} icon={TrendingUp} color="purple" loading={loading}/>
        <StatCard label="Mvts stock effectués" value={mouvements_stock}  icon={Warehouse}    color="amber"  loading={loading}/>
      </div>

      {/* Activité 30 jours */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-gray-900">Commandes créées — 30 derniers jours</h3>
          <span className="text-xs text-gray-400">1 barre = 1 jour</span>
        </div>
        <div className="card-body">
          <ActivityChart data={activite_30j}/>
          {activite_30j?.length > 0 && (
            <p className="text-xs text-gray-400 text-center mt-2">
              Total : {activite_30j.reduce((s,d)=>s+parseInt(d.nb),0)} commandes sur 30 jours
            </p>
          )}
        </div>
      </div>

      {/* Infos compte */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <User size={15} className="text-sky-500"/> Informations du compte
          </h3>
        </div>
        <div className="card-body">
          {[
            { label:'Email',              value: user.email },
            { label:'Identifiant',        value: user.id, mono:true },
            { label:'Membre depuis',      value: new Date(user.created_at).toLocaleDateString('fr-FR',{dateStyle:'long'}) },
            { label:'Dernière connexion', value: user.derniere_connexion
                ? new Date(user.derniere_connexion).toLocaleString('fr-FR')
                : 'Jamais connecté'
            },
          ].map(({ label, value, mono }) => (
            <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-500">{label}</span>
              <span className={`text-sm font-medium ${mono ? 'text-gray-400 font-mono text-xs' : 'text-gray-900'}`}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
