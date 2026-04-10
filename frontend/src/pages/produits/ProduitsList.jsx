import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Filter, Edit2, Trash2,
  Eye, Package, RefreshCw,
} from 'lucide-react';
import { produitsApi } from '../../api/axios';
import useUiStore   from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import toast        from 'react-hot-toast';

// ── Badges ────────────────────────────────────────────────────
const StockBadge = ({ etat, stock }) => {
  if (etat === 'rupture') return <span className="badge badge-red">Rupture ({stock})</span>;
  if (etat === 'alerte')  return <span className="badge badge-amber">Alerte ({stock})</span>;
  return <span className="badge badge-green">{stock}</span>;
};

const StatutBadge = ({ statut }) => {
  const map = { actif:'badge-green', inactif:'badge-gray', rupture:'badge-red', discontinue:'badge-gray' };
  return <span className={`badge ${map[statut] || 'badge-gray'}`}>{statut}</span>;
};

// ── Modal suppression ─────────────────────────────────────────
function ConfirmDelete({ produit, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Supprimer ce produit ?</h3>
            <p className="mt-1 text-sm text-gray-500">
              <span className="font-medium text-gray-700">{produit.nom}</span> sera supprimé
              définitivement. Cette action est irréversible.
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel}  className="btn-secondary">Annuler</button>
          <button onClick={onConfirm} className="btn-danger">Supprimer</button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function ProduitsList() {
  const navigate     = useNavigate();
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const hasRole      = useAuthStore((s) => s.hasRole);
  const canEdit      = hasRole('manager');
  const canDelete    = hasRole('admin');

  const [produits, setProduits] = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [toDelete, setToDelete] = useState(null);
  const [search,   setSearch]   = useState('');
  const [statut,   setStatut]   = useState('');
  const [page,     setPage]     = useState(1);
  const LIMIT = 20;

  useEffect(() => { setPageTitle('Produits'); }, [setPageTitle]);

  const fetchProduits = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await produitsApi.getAll({
        search: search || undefined,
        statut: statut || undefined,
        page, limit: LIMIT,
      });
      setProduits(res.data);
      setTotal(res.total);
    } catch (err) {
      toast.error(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [search, statut, page]);

  useEffect(() => { fetchProduits(); }, [fetchProduits]);
  useEffect(() => { setPage(1); }, [search, statut]);

  const handleDelete = async () => {
    try {
      await produitsApi.remove(toDelete.id);
      toast.success('Produit supprimé');
      setToDelete(null);
      fetchProduits();
    } catch (err) {
      toast.error(err.message || 'Erreur suppression');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      {/* En-tête */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Produits</h2>
          <p className="page-subtitle">{total} produit{total !== 1 ? 's' : ''}</p>
        </div>
        {canEdit && (
          <button onClick={() => navigate('/produits/nouveau')} className="btn-primary">
            <Plus size={16} /> Nouveau produit
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="card mb-4 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Nom, référence, code-barre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
            className="input-field pl-9 w-full sm:w-44 appearance-none"
          >
            <option value="">Tous les statuts</option>
            <option value="actif">Actif</option>
            <option value="inactif">Inactif</option>
            <option value="rupture">Rupture</option>
            <option value="discontinue">Discontinué</option>
          </select>
        </div>
        <button onClick={fetchProduits} className="btn-secondary px-3" title="Rafraîchir">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tableau */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto-layout">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Référence</th>
                <th>Catégorie</th>
                <th>Prix TTC</th>
                <th>Stock</th>
                <th>Statut</th>
                <th>Marge</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : produits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <Package size={32} className="mx-auto mb-3 opacity-30" />
                    <p>Aucun produit trouvé</p>
                    {search && (
                      <button onClick={() => setSearch('')} className="mt-2 text-sm text-sky-600 hover:underline">
                        Effacer la recherche
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                produits.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400">
                          <Package size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate max-w-[180px]">{p.nom}</p>
                          {p.marque_nom && <p className="text-xs text-gray-400">{p.marque_nom}</p>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                        {p.reference}
                      </code>
                    </td>
                    <td className="text-gray-500 text-sm">{p.categorie_nom || '—'}</td>
                    <td className="font-medium text-gray-900">
                      {Number(p.prix_vente_ttc).toLocaleString('fr-MG')} Ar
                    </td>
                    <td><StockBadge etat={p.etat_stock} stock={p.stock_actuel} /></td>
                    <td><StatutBadge statut={p.statut} /></td>
                    <td>
                      <span className={`text-sm font-medium ${
                        Number(p.prix_vente_ht) > 0
                          ? (((p.prix_vente_ht - p.prix_achat_ht) / p.prix_vente_ht) * 100) > 30
                            ? 'text-green-600'
                            : (((p.prix_vente_ht - p.prix_achat_ht) / p.prix_vente_ht) * 100) > 10
                              ? 'text-amber-600' : 'text-red-500'
                          : 'text-gray-400'
                      }`}>
                        {Number(p.prix_vente_ht) > 0
                          ? `${Math.round(((p.prix_vente_ht - p.prix_achat_ht) / p.prix_vente_ht) * 100)}%`
                          : '—'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/produits/${p.id}`)} className="btn-ghost p-1.5" title="Voir">
                          <Eye size={15} />
                        </button>
                        {canEdit && (
                          <button onClick={() => navigate(`/produits/${p.id}/edit`)} className="btn-ghost p-1.5" title="Modifier">
                            <Edit2 size={15} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setToDelete(p)}
                            className="btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"
                            title="Supprimer"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} sur {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
              >
                ← Précédent
              </button>
              <span className="text-sm text-gray-600">Page {page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
              >
                Suivant →
              </button>
            </div>
          </div>
        )}
      </div>

      {toDelete && (
        <ConfirmDelete
          produit={toDelete}
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
