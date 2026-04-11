import { useEffect, useState } from 'react';
import {
  TrendingUp, Users, Package, BarChart3,
  ArrowUp, ArrowDown, RefreshCw, Calendar,
} from 'lucide-react';
import api        from '../../api/axios';
import useUiStore from '../../store/uiStore';
import toast      from 'react-hot-toast';

// ── Carte métrique ────────────────────────────────────────────
const MetricCard = ({ label, value, sub, color = 'sky', loading }) => {
  const colors = {
    sky:    'border-l-sky-500',
    green:  'border-l-green-500',
    amber:  'border-l-amber-500',
    purple: 'border-l-purple-500',
    red:    'border-l-red-500',
  };
  return (
    <div className={`card p-5 border-l-4 ${colors[color]}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      {loading
        ? <div className="h-7 w-28 bg-gray-100 rounded animate-pulse" />
        : <p className="text-2xl font-bold text-gray-900">{value}</p>
      }
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
};

// ── Bar chart simple ──────────────────────────────────────────
const BarChart = ({ data, keyX, keyY, label, color = '#0ea5e9' }) => {
  if (!data?.length) return <p className="text-sm text-gray-400 text-center py-8">Pas de données</p>;
  const max = Math.max(...data.map((d) => parseFloat(d[keyY]) || 0), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const pct   = ((parseFloat(d[keyY]) || 0) / max) * 100;
        const valFmt = label === 'Ar'
          ? `${(parseFloat(d[keyY])/1000).toFixed(0)}k Ar`
          : parseFloat(d[keyY]).toFixed(0);
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-24 truncate flex-shrink-0">{d[keyX]}</span>
            <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
              <div className="h-full rounded transition-all" style={{ width:`${pct}%`, background: color }} />
            </div>
            <span className="text-xs font-medium text-gray-700 w-20 text-right flex-shrink-0">{valFmt}</span>
          </div>
        );
      })}
    </div>
  );
};

// ── Sparkline CA par jour ─────────────────────────────────────
const Sparkline = ({ data }) => {
  if (!data?.length) return <p className="text-sm text-gray-400 text-center py-6">Aucune donnée</p>;
  const vals = data.map((d) => parseFloat(d.ca_ttc) || 0);
  const max  = Math.max(...vals, 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full bg-gray-100 rounded-t" style={{ height: '60px' }}>
            <div className="w-full bg-sky-500 rounded-t" style={{ height:`${(vals[i]/max)*100}%`, minHeight: vals[i]>0?'2px':'0' }} />
          </div>
          <span className="text-[9px] text-gray-400">
            {new Date(d.jour).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Badge confiance prévision ─────────────────────────────────
const ConfidenceBadge = ({ pct }) => {
  const cls = pct >= 70 ? 'badge-green' : pct >= 50 ? 'badge-amber' : 'badge-red';
  return <span className={`badge ${cls}`}>{pct}%</span>;
};

// ── Page KPIs ─────────────────────────────────────────────────
export default function KpisPage() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const [periode,    setPeriode]    = useState('mois');
  const [ventes,     setVentes]     = useState(null);
  const [topProd,    setTopProd]    = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [previsions, setPrevisions] = useState({ historique:[], previsions:[] });
  const [stockVal,   setStockVal]   = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => { setPageTitle('KPIs & Analytique'); }, [setPageTitle]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [v, tp, tc, pv, sv] = await Promise.all([
        api.get('/kpis/ventes',       { params: { periode } }),
        api.get('/kpis/top-produits', { params: { limit: 8 } }),
        api.get('/kpis/top-clients',  { params: { limit: 8 } }),
        api.get('/kpis/previsions'),
        api.get('/kpis/stock-valeur'),
      ]);
      setVentes(v.data.data);
      setTopProd(tp.data.data);
      setTopClients(tc.data.data);
      setPrevisions(pv.data.data);
      setStockVal(sv.data.data);
    } catch (err) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [periode]);

  const fmtAr = (v) => v ? `${Number(v).toLocaleString('fr-MG',{maximumFractionDigits:0})} Ar` : '0 Ar';
  const r = ventes?.resume || {};

  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="page-header">
        <div>
          <h2 className="page-title">KPIs & Analytique</h2>
          <p className="page-subtitle">Vue d'ensemble des performances</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {[
              { key:'mois',  label:'Ce mois' },
              { key:'annee', label:'Cette année' },
            ].map(({ key, label }) => (
              <button key={key}
                onClick={() => setPeriode(key)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  periode === key ? 'bg-sky-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button onClick={fetchAll} className="btn-secondary px-3">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="CA HT"         value={loading ? '—' : fmtAr(r.ca_ht)}       color="sky"    loading={loading} />
        <MetricCard label="CA TTC"         value={loading ? '—' : fmtAr(r.ca_ttc)}      color="green"  loading={loading} />
        <MetricCard label="Commandes"      value={loading ? '—' : r.nb_commandes ?? 0}  color="purple" sub={loading ? '' : `${r.nb_clients ?? 0} clients uniques`} loading={loading} />
        <MetricCard label="Panier moyen"   value={loading ? '—' : fmtAr(r.panier_moyen)} color="amber" loading={loading} />
      </div>

      {/* Ligne 2 — CA par jour + Catégories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-900">Évolution CA TTC</h3>
            <span className="text-xs text-gray-400">{ventes?.parJour?.length || 0} jours</span>
          </div>
          <div className="card-body">
            {loading ? <div className="h-20 bg-gray-50 rounded animate-pulse" />
              : <Sparkline data={ventes?.parJour || []} />}
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-900">CA par catégorie</h3>
          </div>
          <div className="card-body">
            {loading ? <div className="h-32 bg-gray-50 rounded animate-pulse" /> : (
              <BarChart data={ventes?.parCategorie || []} keyX="categorie" keyY="ca_ht" label="Ar" />
            )}
          </div>
        </div>
      </div>

      {/* Ligne 3 — Top produits + Top clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top produits */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Package size={15} className="text-sky-500" /> Top produits
            </h3>
          </div>
          <div className="card-body p-0">
            {loading ? <div className="p-4 space-y-2">{[...Array(5)].map((_,i)=><div key={i} className="h-8 bg-gray-50 rounded animate-pulse"/>)}</div> : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">#</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Produit</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Qté</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">CA HT</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Marge</th>
                </tr></thead>
                <tbody>
                  {topProd.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-6 text-gray-400">Aucune vente</td></tr>
                  ) : topProd.map((p, i) => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-400 font-medium">{p.rang || i+1}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-900 truncate max-w-[140px]">{p.nom}</p>
                        <p className="text-xs text-gray-400">{p.reference}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium">{p.qte_vendue}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {(parseFloat(p.ca_ht)/1000).toFixed(0)}k
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`text-xs font-medium ${parseFloat(p.marge)>0?'text-green-600':'text-red-500'}`}>
                          {parseFloat(p.marge)>0 ? `+${(parseFloat(p.marge)/1000).toFixed(0)}k` : '—'}
                        </span>
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
              <Users size={15} className="text-sky-500" /> Top clients
            </h3>
          </div>
          <div className="card-body p-0">
            {loading ? <div className="p-4 space-y-2">{[...Array(5)].map((_,i)=><div key={i} className="h-8 bg-gray-50 rounded animate-pulse"/>)}</div> : (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">#</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Client</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Cmds</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">CA TTC</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Panier moy.</th>
                </tr></thead>
                <tbody>
                  {topClients.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-6 text-gray-400">Aucun client</td></tr>
                  ) : topClients.map((c, i) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-400 font-medium">{c.rang || i+1}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-900 truncate max-w-[140px]">{c.nom_complet}</p>
                        {c.email && <p className="text-xs text-gray-400 truncate">{c.email}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium">{c.nb_commandes}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                        {(parseFloat(c.ca_total)/1000).toFixed(0)}k
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500">
                        {(parseFloat(c.panier_moyen)/1000).toFixed(0)}k
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Prévisions de ventes */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp size={15} className="text-sky-500" /> Prévisions de ventes
          </h3>
          <span className="text-xs text-gray-400">Régression linéaire — 6 mois d'historique</span>
        </div>
        <div className="card-body">
          {loading ? <div className="h-24 bg-gray-50 rounded animate-pulse" /> : (
            previsions.previsions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                Pas assez de données (minimum 2 mois d'historique)
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {previsions.previsions.map((p) => (
                  <div key={p.mois} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                        <Calendar size={13} className="text-sky-500" />
                        {new Date(p.mois + '-01').toLocaleDateString('fr-FR',{month:'long', year:'numeric'})}
                      </p>
                      <ConfidenceBadge pct={p.confiance} />
                    </div>
                    <p className="text-xl font-bold text-sky-600">
                      {Number(p.ca_prevu).toLocaleString('fr-MG',{maximumFractionDigits:0})} Ar
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      ~{p.qte_prevue} unités prévues
                    </p>
                    <p className="text-[10px] text-gray-400 mt-2">
                      Confiance : {p.confiance}%
                    </p>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Valeur stock */}
      {stockVal && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Package size={15} className="text-sky-500" /> Valeur du stock
            </h3>
            <div className="flex gap-4 text-sm">
              <span className="text-gray-500">
                Achat : <span className="font-semibold text-gray-900">
                  {fmtAr(stockVal.totaux?.valeur_achat)}
                </span>
              </span>
              <span className="text-gray-500">
                Vente pot. : <span className="font-semibold text-green-600">
                  {fmtAr(stockVal.totaux?.valeur_vente)}
                </span>
              </span>
            </div>
          </div>
          <div className="card-body">
            <BarChart
              data={stockVal.parCategorie || []}
              keyX="categorie"
              keyY="valeur_achat"
              label="Ar"
              color="#0f6e56"
            />
          </div>
        </div>
      )}
    </div>
  );
}
