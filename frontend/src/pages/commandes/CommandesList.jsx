import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Filter, Eye, ChevronRight,
  ShoppingCart, RefreshCw, Clock,
} from 'lucide-react';
import api         from '../../api/axios';
import useUiStore  from '../../store/uiStore';
import toast       from 'react-hot-toast';

// ── Config statuts ────────────────────────────────────────────
const STATUTS = {
  brouillon:      { label: 'Brouillon',       cls: 'badge-gray'   },
  confirmee:      { label: 'Confirmée',        cls: 'badge-sky'    },
  en_preparation: { label: 'En préparation',  cls: 'badge-amber'  },
  expediee:       { label: 'Expédiée',         cls: 'badge-purple' },
  livree:         { label: 'Livrée',           cls: 'badge-green'  },
  annulee:        { label: 'Annulée',          cls: 'badge-red'    },
  remboursee:     { label: 'Remboursée',       cls: 'badge-red'    },
};

const TYPES = {
  vente:       { label: 'Vente',        cls: 'badge-sky'    },
  precommande: { label: 'Précommande',  cls: 'badge-purple' },
  devis:       { label: 'Devis',        cls: 'badge-gray'   },
};

const PAIEMENT = {
  en_attente: { label: 'En attente', cls: 'badge-amber' },
  partiel:    { label: 'Partiel',    cls: 'badge-amber' },
  paye:       { label: 'Payé',       cls: 'badge-green' },
  rembourse:  { label: 'Remboursé',  cls: 'badge-red'   },
  echoue:     { label: 'Échoué',     cls: 'badge-red'   },
};

// ── Page ──────────────────────────────────────────────────────
export default function CommandesList() {
  const navigate     = useNavigate();
  const setPageTitle = useUiStore((s) => s.setPageTitle);

  const [commandes, setCommandes] = useState([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [statut,    setStatut]    = useState('');
  const [type,      setType]      = useState('');
  const [page,      setPage]      = useState(1);
  const LIMIT = 20;

  useEffect(() => { setPageTitle('Commandes'); }, [setPageTitle]);

  const fetchCommandes = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/commandes', {
        params: { search: search||undefined, statut: statut||undefined, type: type||undefined, page, limit: LIMIT },
      });
      setCommandes(res.data);
      setTotal(res.total);
    } catch (err) {
      toast.error(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [search, statut, type, page]);

  useEffect(() => { fetchCommandes(); }, [fetchCommandes]);
  useEffect(() => { setPage(1); }, [search, statut, type]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      {/* En-tête */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Commandes</h2>
          <p className="page-subtitle">{total} commande{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => navigate('/commandes/nouveau')} className="btn-primary">
          <Plus size={16} /> Nouvelle commande
        </button>
      </div>

      {/* Filtres */}
      <div className="card mb-4 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Numéro, nom client…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)}
          className="input-field w-full sm:w-40 appearance-none">
          <option value="">Tous les types</option>
          <option value="vente">Vente</option>
          <option value="precommande">Précommande</option>
          <option value="devis">Devis</option>
        </select>
        <select value={statut} onChange={(e) => setStatut(e.target.value)}
          className="input-field w-full sm:w-44 appearance-none">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUTS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button onClick={fetchCommandes} className="btn-secondary px-3">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tableau */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto-layout">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Type</th>
                <th>Client</th>
                <th>Vendeur</th>
                <th>Total TTC</th>
                <th>Paiement</th>
                <th>Statut</th>
                <th>Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(9)].map((_, j) => (
                    <td key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : commandes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    <ShoppingCart size={32} className="mx-auto mb-3 opacity-30" />
                    <p>Aucune commande trouvée</p>
                  </td>
                </tr>
              ) : (
                commandes.map((c) => {
                  const st = STATUTS[c.statut] || { label: c.statut, cls: 'badge-gray' };
                  const tp = TYPES[c.type]     || { label: c.type,   cls: 'badge-gray' };
                  const pm = PAIEMENT[c.paiement_statut] || { label: '—', cls: 'badge-gray' };
                  return (
                    <tr key={c.id} className="cursor-pointer" onClick={() => navigate(`/commandes/${c.id}`)}>
                      <td>
                        <span className="font-mono text-sm font-medium text-gray-900">{c.numero}</span>
                      </td>
                      <td><span className={`badge ${tp.cls}`}>{tp.label}</span></td>
                      <td>
                        <p className="font-medium text-gray-900 truncate max-w-[140px]">
                          {c.client_nom || <span className="text-gray-400 italic">Anonyme</span>}
                        </p>
                      </td>
                      <td className="text-gray-500 text-sm">{c.vendeur_nom || '—'}</td>
                      <td className="font-semibold text-gray-900">
                        {Number(c.total_ttc).toLocaleString('fr-MG', { maximumFractionDigits: 0 })} Ar
                      </td>
                      <td><span className={`badge ${pm.cls}`}>{pm.label}</span></td>
                      <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                      <td className="text-gray-500 text-sm">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(c.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </td>
                      <td>
                        <div className="flex justify-end">
                          <button className="btn-ghost p-1.5" title="Voir">
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {((page-1)*LIMIT)+1}–{Math.min(page*LIMIT, total)} sur {total}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p-1))}
                disabled={page === 1} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">
                ← Précédent
              </button>
              <span className="text-sm text-gray-600">Page {page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p+1))}
                disabled={page === totalPages} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
