import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trash2, RotateCcw, Search, Package,
  AlertTriangle, RefreshCw, ArrowLeft,
} from 'lucide-react';
import api         from '../../api/axios';
import useUiStore  from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import toast        from 'react-hot-toast';

// ── Modal confirmation suppression définitive ─────────────────
function ConfirmHardDelete({ produit, onConfirm, onCancel }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <Trash2 size={18} className="text-red-600"/>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Suppression définitive</h3>
            <p className="text-sm text-gray-500 mt-1">
              <span className="font-medium text-gray-800">{produit.nom}</span> sera
              supprimé définitivement de la base de données.
              Cette action est <span className="font-semibold text-red-600">irréversible</span>.
            </p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5">
          <p className="text-xs text-red-700">
            Les mouvements de stock et lignes de commandes liés à ce produit
            seront conservés pour l'historique, mais le produit ne pourra plus être restauré.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">Annuler</button>
          <button
            onClick={async () => {
              setConfirming(true);
              await onConfirm();
              setConfirming(false);
            }}
            disabled={confirming}
            className="btn-danger flex-1"
          >
            {confirming ? 'Suppression…' : 'Supprimer définitivement'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProduitsArchives() {
  const navigate     = useNavigate();
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const isAdmin      = useAuthStore((s) => s.hasRole('admin'));

  const [archives,  setArchives]  = useState([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [page,      setPage]      = useState(1);
  const [toDelete,  setToDelete]  = useState(null);
  const LIMIT = 20;

  useEffect(() => { setPageTitle('Produits archivés'); }, [setPageTitle]);

  const fetchArchives = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/produits/archives', {
        params: { search: search || undefined, page, limit: LIMIT },
      });
      setArchives(res.data);
      setTotal(res.total);
    } catch (err) {
      toast.error(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchArchives(); }, [fetchArchives]);
  useEffect(() => { setPage(1); }, [search]);

  const handleRestore = async (produit) => {
    try {
      const { data: res } = await api.patch(`/produits/${produit.id}/restore`);
      toast.success(`"${res.data.nom}" restauré avec succès`);
      fetchArchives();
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la restauration');
    }
  };

  const handleHardDelete = async () => {
    try {
      // Suppression physique — nécessite un endpoint dédié
      await api.delete(`/produits/${toDelete.id}/permanent`);
      toast.success('Produit supprimé définitivement');
      setToDelete(null);
      fetchArchives();
    } catch (err) {
      // Si pas encore implémenté côté backend, on informe
      toast.error(err.message || 'Suppression définitive non disponible');
      setToDelete(null);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      {/* En-tête */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/produits')} className="btn-ghost p-2">
            <ArrowLeft size={18}/>
          </button>
          <div>
            <h2 className="page-title flex items-center gap-2">
              <Trash2 size={18} className="text-red-500"/>
              Produits archivés
            </h2>
            <p className="page-subtitle">{total} produit{total!==1?'s':''} dans la corbeille</p>
          </div>
        </div>
        <button onClick={fetchArchives} className="btn-secondary px-3">
          <RefreshCw size={15} className={loading?'animate-spin':''}/>
        </button>
      </div>

      {/* Bandeau info */}
      <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
        <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5"/>
        <div className="text-sm text-amber-800">
          <p className="font-medium">Corbeille des produits</p>
          <p className="text-amber-600 text-xs mt-0.5">
            Les produits archivés n'apparaissent plus dans le catalogue. Restaurez-les pour les remettre en vente,
            ou supprimez-les définitivement.
          </p>
        </div>
      </div>

      {/* Filtre */}
      <div className="card mb-4 p-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input type="text" placeholder="Nom, référence…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"/>
        </div>
      </div>

      {/* Tableau */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto-layout">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Référence</th>
                <th>Archivé le</th>
                <th>Archivé par</th>
                <th>Motif</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>{[...Array(6)].map((_,j) => (
                    <td key={j}><div className="h-4 bg-gray-100 rounded animate-pulse"/></td>
                  ))}</tr>
                ))
              ) : archives.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                        <Package size={24} className="text-green-500"/>
                      </div>
                      <div>
                        <p className="font-medium text-gray-600">Corbeille vide</p>
                        <p className="text-sm text-gray-400 mt-0.5">Aucun produit archivé</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                archives.map((p) => (
                  <tr key={p.id} className="opacity-75 hover:opacity-100 transition-opacity">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                          <Package size={15} className="text-red-400"/>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-700 truncate max-w-[180px] line-through">
                            {p.nom}
                          </p>
                          {p.marque_nom && (
                            <p className="text-xs text-gray-400">{p.marque_nom}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">
                        {p.reference}
                      </code>
                    </td>
                    <td className="text-gray-500 text-sm">
                      {p.deleted_at
                        ? new Date(p.deleted_at).toLocaleDateString('fr-FR', { dateStyle:'short' })
                        : '—'}
                    </td>
                    <td className="text-gray-500 text-sm">
                      {p.supprime_par_nom || '—'}
                    </td>
                    <td className="text-gray-400 text-sm max-w-[150px]">
                      <span className="truncate block">{p.delete_motif || '—'}</span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        {/* Restaurer */}
                        <button
                          onClick={() => handleRestore(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors"
                          title="Restaurer ce produit"
                        >
                          <RotateCcw size={13}/> Restaurer
                        </button>
                        {/* Supprimer définitivement — admin seulement */}
                        {isAdmin && (
                          <button
                            onClick={() => setToDelete(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
                            title="Supprimer définitivement"
                          >
                            <Trash2 size={13}/> Supprimer
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

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {((page-1)*LIMIT)+1}–{Math.min(page*LIMIT,total)} sur {total}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">← Précédent</button>
              <span className="text-sm text-gray-600">Page {page}/{totalPages}</span>
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">Suivant →</button>
            </div>
          </div>
        )}
      </div>

      {toDelete && (
        <ConfirmHardDelete
          produit={toDelete}
          onConfirm={handleHardDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
