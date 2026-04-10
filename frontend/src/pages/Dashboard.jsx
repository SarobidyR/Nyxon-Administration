import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Users, Package, AlertTriangle,
  TrendingUp, ArrowUpRight, RefreshCw, BarChart3,
} from 'lucide-react';
import useUiStore   from '../store/uiStore';
import useAuthStore from '../store/authStore';
import api          from '../api/axios';
import toast        from 'react-hot-toast';

// ── Carte KPI ─────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color, loading }) {
  const colors = {
    sky:    'bg-sky-50   text-sky-600   border-sky-100',
    green:  'bg-green-50 text-green-600 border-green-100',
    amber:  'bg-amber-50 text-amber-600 border-amber-100',
    red:    'bg-red-50   text-red-600   border-red-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${colors[color] || colors.sky}`}>
          <Icon size={18} />
        </div>
        <ArrowUpRight size={14} className="text-gray-300" />
      </div>
      <div className="mt-4">
        {loading ? (
          <div className="h-7 w-24 bg-gray-100 rounded animate-pulse mb-1" />
        ) : (
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        )}
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Mini bar chart CA ──────────────────────────────────────────
function MiniBarChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">Aucune donnée cette semaine</p>;
  }
  const max = Math.max(...data.map((d) => parseFloat(d.ca_ttc) || 0), 1);

  return (
    <div className="flex items-end gap-2 h-28">
      {data.map((d) => {
        const h = ((parseFloat(d.ca_ttc) || 0) / max) * 100;
        const label = new Date(d.jour).toLocaleDateString('fr-FR', { weekday: 'short' });
        return (
          <div key={d.jour} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-400">
              {parseFloat(d.ca_ttc) > 0
                ? `${(parseFloat(d.ca_ttc) / 1000).toFixed(0)}k`
                : ''}
            </span>
            <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '80px' }}>
              <div
                className="absolute bottom-0 w-full bg-sky-500 rounded-t transition-all"
                style={{ height: `${Math.max(h, 2)}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400 capitalize">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Page Dashboard ────────────────────────────────────────────
export default function Dashboard() {
  const navigate     = useNavigate();
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const user         = useAuthStore((s) => s.user);

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setPageTitle('Dashboard'); }, [setPageTitle]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/kpis/dashboard');
      setData(res.data.data);
    } catch (err) {
      // Données vides si pas encore de commandes (Phase 1)
      setData({
        kpis:         {},
        topProduits:  [],
        topClients:   [],
        evolutionCA:  [],
        alertesStock: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const kpis        = data?.kpis         || {};
  const topProduits = data?.topProduits  || [];
  const topClients  = data?.topClients   || [];
  const evolutionCA = data?.evolutionCA  || [];
  const alertes     = data?.alertesStock || [];

  const fmtAr = (v) =>
    v ? `${Number(v).toLocaleString('fr-MG', { maximumFractionDigits: 0 })} Ar` : '0 Ar';

  return (
    <div className="space-y-6">

      {/* ── Salutation ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">
            Bonjour, {user?.prenom} 👋
          </h2>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
        <button onClick={fetchDashboard} className="btn-secondary" title="Rafraîchir">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Rafraîchir</span>
        </button>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Commandes aujourd'hui"
          value={kpis.cmds_aujourd_hui ?? '—'}
          icon={ShoppingCart}
          color="sky"
          loading={loading}
        />
        <KpiCard
          label="CA aujourd'hui"
          value={loading ? '—' : fmtAr(kpis.ca_aujourd_hui)}
          icon={TrendingUp}
          color="green"
          loading={loading}
        />
        <KpiCard
          label="Commandes ce mois"
          value={kpis.cmds_mois ?? '—'}
          sub={loading ? '' : `CA : ${fmtAr(kpis.ca_mois)}`}
          icon={BarChart3}
          color="purple"
          loading={loading}
        />
        <KpiCard
          label="Alertes stock"
          value={loading ? '—' : `${(kpis.nb_ruptures ?? 0)} rupture${kpis.nb_ruptures !== 1 ? 's' : ''}`}
          sub={loading ? '' : `${kpis.nb_alertes ?? 0} en alerte`}
          icon={AlertTriangle}
          color={kpis.nb_ruptures > 0 ? 'red' : 'amber'}
          loading={loading}
        />
      </div>

      {/* ── Ligne 2 ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Évolution CA 7 jours */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-900">CA des 7 derniers jours</h3>
            <span className="text-xs text-gray-400">en Ariary</span>
          </div>
          <div className="card-body">
            {loading
              ? <div className="h-28 bg-gray-50 rounded animate-pulse" />
              : <MiniBarChart data={evolutionCA} />
            }
          </div>
        </div>

        {/* En attente */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-900">À traiter</h3>
          </div>
          <div className="card-body space-y-3">
            {[
              { label: 'Commandes confirmées', value: kpis.cmds_en_attente ?? 0, color: 'text-sky-600', to: '/commandes' },
              { label: 'Précommandes actives', value: kpis.precommandes_actives ?? 0, color: 'text-purple-600', to: '/commandes' },
              { label: 'Ruptures de stock',    value: kpis.nb_ruptures ?? 0, color: 'text-red-600', to: '/produits?statut=rupture' },
            ].map(({ label, value, color, to }) => (
              <button
                key={label}
                onClick={() => navigate(to)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm text-gray-600">{label}</span>
                <span className={`text-lg font-bold ${color}`}>{loading ? '—' : value}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Ligne 3 ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top produits */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Package size={15} className="text-sky-500" />
              Top produits — ce mois
            </h3>
            <button onClick={() => navigate('/produits')} className="text-xs text-sky-600 hover:underline">
              Voir tout →
            </button>
          </div>
          <div className="card-body p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />
                ))}
              </div>
            ) : topProduits.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Aucune vente ce mois</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Produit</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Qté</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">CA HT</th>
                  </tr>
                </thead>
                <tbody>
                  {topProduits.map((p, i) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-gray-400 font-medium">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-900 truncate max-w-[150px]">{p.nom}</p>
                        <p className="text-xs text-gray-400">{p.reference}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900">{p.qte_vendue}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {Number(p.ca_ht).toLocaleString('fr-MG', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Top clients */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Users size={15} className="text-sky-500" />
              Top clients — ce mois
            </h3>
            <button onClick={() => navigate('/clients')} className="text-xs text-sky-600 hover:underline">
              Voir tout →
            </button>
          </div>
          <div className="card-body p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-50 rounded animate-pulse" />
                ))}
              </div>
            ) : topClients.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Aucun client ce mois</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">#</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Client</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Cmds</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">CA TTC</th>
                  </tr>
                </thead>
                <tbody>
                  {topClients.map((c, i) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-gray-400 font-medium">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-900 truncate max-w-[150px]">{c.nom_complet}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900">{c.nb_commandes}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {Number(c.ca_total).toLocaleString('fr-MG', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── Alertes stock ─────────────────────────────────────── */}
      {!loading && alertes.length > 0 && (
        <div className="card border-amber-200">
          <div className="card-header bg-amber-50 rounded-t-xl">
            <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-500" />
              Alertes stock ({alertes.length})
            </h3>
            <button onClick={() => navigate('/produits')} className="text-xs text-amber-700 hover:underline">
              Gérer →
            </button>
          </div>
          <div className="card-body p-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {alertes.map((a) => (
                <div
                  key={a.id}
                  onClick={() => navigate(`/produits/${a.id}`)}
                  className="flex items-center justify-between px-4 py-3
                             border-b border-gray-100 last:border-0
                             hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.nom}</p>
                    <p className="text-xs text-gray-400">{a.reference}</p>
                  </div>
                  <span className={`badge ml-3 flex-shrink-0 ${a.etat === 'rupture' ? 'badge-red' : 'badge-amber'}`}>
                    {a.stock_actuel} / {a.stock_minimum}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
