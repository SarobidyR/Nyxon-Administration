import { useEffect, useState, useCallback } from 'react';
import { Plus, ArrowUp, ArrowDown, RefreshCw, SlidersHorizontal, Warehouse } from 'lucide-react';
import api        from '../../api/axios';
import useUiStore from '../../store/uiStore';
import toast      from 'react-hot-toast';

// ── Config types de mouvement ─────────────────────────────────
const TYPE_CONFIG = {
  entree_achat:       { label: 'Entrée achat',       icon: ArrowUp,   cls: 'text-green-600 bg-green-50' },
  entree_retour:      { label: 'Retour client',       icon: ArrowUp,   cls: 'text-green-600 bg-green-50' },
  entree_ajustement:  { label: 'Ajust. +',            icon: ArrowUp,   cls: 'text-sky-600   bg-sky-50'   },
  sortie_vente:       { label: 'Sortie vente',        icon: ArrowDown, cls: 'text-red-600   bg-red-50'   },
  sortie_perte:       { label: 'Perte / Casse',       icon: ArrowDown, cls: 'text-red-600   bg-red-50'   },
  sortie_ajustement:  { label: 'Ajust. -',            icon: ArrowDown, cls: 'text-amber-600 bg-amber-50' },
};

// ── Modal entrée stock ────────────────────────────────────────
function ModalEntree({ onClose, onSuccess }) {
  const [form, setForm]   = useState({ produit_id:'', quantite:'', prix_unitaire:'', reference_doc:'', motif:'' });
  const [produits, setProduits] = useState([]);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    api.get('/produits', { params: { limit: 200 } })
      .then(({ data: r }) => setProduits(r.data || []))
      .catch(() => {});
  }, []);

  const submit = async () => {
    if (!form.produit_id || !form.quantite) return toast.error('Produit et quantité requis');
    setSaving(true);
    try {
      await api.post('/stock/entree', {
        produit_id:    form.produit_id,
        quantite:      parseInt(form.quantite),
        prix_unitaire: form.prix_unitaire ? parseFloat(form.prix_unitaire) : undefined,
        reference_doc: form.reference_doc || undefined,
        motif:         form.motif || undefined,
      });
      toast.success('Entrée enregistrée');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <ArrowUp size={16} className="text-green-600" /> Entrée de stock
        </h3>
        <div className="space-y-4">
          <div>
            <label className="label">Produit *</label>
            <select value={form.produit_id} onChange={(e) => setForm({ ...form, produit_id: e.target.value })}
              className="input-field appearance-none">
              <option value="">— Sélectionner —</option>
              {produits.map((p) => (
                <option key={p.id} value={p.id}>{p.nom} ({p.reference}) — stock: {p.stock_actuel}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Quantité *</label>
              <input type="number" min="1" value={form.quantite}
                onChange={(e) => setForm({ ...form, quantite: e.target.value })}
                className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="label">Prix unitaire (Ar)</label>
              <input type="number" min="0" value={form.prix_unitaire}
                onChange={(e) => setForm({ ...form, prix_unitaire: e.target.value })}
                className="input-field" placeholder="Optionnel" />
            </div>
          </div>
          <div>
            <label className="label">Référence document (BL, facture…)</label>
            <input type="text" value={form.reference_doc}
              onChange={(e) => setForm({ ...form, reference_doc: e.target.value })}
              className="input-field" placeholder="Ex: BL-2024-001" />
          </div>
          <div>
            <label className="label">Motif</label>
            <input type="text" value={form.motif}
              onChange={(e) => setForm({ ...form, motif: e.target.value })}
              className="input-field" placeholder="Réapprovisionnement, retour…" />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={submit} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Enregistrement…' : 'Valider entrée'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal sortie/ajustement ───────────────────────────────────
function ModalSortie({ type, onClose, onSuccess }) {
  const isAjust = type === 'ajustement';
  const [form, setForm]         = useState({ produit_id:'', quantite:'', stock_reel:'', motif:'' });
  const [produits, setProduits] = useState([]);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    api.get('/produits', { params: { limit: 200 } })
      .then(({ data: r }) => setProduits(r.data || []))
      .catch(() => {});
  }, []);

  const submit = async () => {
    if (!form.produit_id) return toast.error('Produit requis');
    if (!form.motif)      return toast.error('Motif requis');
    setSaving(true);
    try {
      const endpoint = isAjust ? '/stock/ajustement' : '/stock/sortie';
      const payload  = isAjust
        ? { produit_id: form.produit_id, stock_reel: parseInt(form.stock_reel), motif: form.motif }
        : { produit_id: form.produit_id, quantite: parseInt(form.quantite), motif: form.motif };
      await api.post(endpoint, payload);
      toast.success(isAjust ? 'Ajustement effectué' : 'Sortie enregistrée');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
          {isAjust
            ? <><SlidersHorizontal size={16} className="text-sky-500" /> Ajustement de stock</>
            : <><ArrowDown size={16} className="text-red-500" /> Sortie de stock</>
          }
        </h3>
        <div className="space-y-4">
          <div>
            <label className="label">Produit *</label>
            <select value={form.produit_id} onChange={(e) => setForm({ ...form, produit_id: e.target.value })}
              className="input-field appearance-none">
              <option value="">— Sélectionner —</option>
              {produits.map((p) => (
                <option key={p.id} value={p.id}>{p.nom} ({p.reference}) — stock: {p.stock_actuel}</option>
              ))}
            </select>
          </div>
          {isAjust ? (
            <div>
              <label className="label">Stock réel constaté *</label>
              <input type="number" min="0" value={form.stock_reel}
                onChange={(e) => setForm({ ...form, stock_reel: e.target.value })}
                className="input-field" placeholder="0" />
            </div>
          ) : (
            <div>
              <label className="label">Quantité *</label>
              <input type="number" min="1" value={form.quantite}
                onChange={(e) => setForm({ ...form, quantite: e.target.value })}
                className="input-field" placeholder="0" />
            </div>
          )}
          <div>
            <label className="label">Motif *</label>
            <input type="text" value={form.motif}
              onChange={(e) => setForm({ ...form, motif: e.target.value })}
              className="input-field" placeholder={isAjust ? 'Inventaire, correction…' : 'Perte, casse, vol…'} />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose}  className="btn-secondary flex-1">Annuler</button>
          <button onClick={submit} disabled={saving} className={isAjust ? 'btn-primary flex-1' : 'btn-danger flex-1'}>
            {saving ? 'Enregistrement…' : isAjust ? 'Ajuster' : 'Valider sortie'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────
export default function StockMouvements() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const [mouvements, setMouvements] = useState([]);
  const [total,      setTotal]      = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null); // 'entree'|'sortie'|'ajustement'
  const [page,       setPage]       = useState(1);
  const LIMIT = 30;

  useEffect(() => { setPageTitle('Mouvements de stock'); }, [setPageTitle]);

  const fetchMouvements = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/stock/mouvements', { params: { page, limit: LIMIT } });
      setMouvements(res.data);
      setTotal(res.total);
    } catch (err) {
      toast.error(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchMouvements(); }, [fetchMouvements]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Mouvements de stock</h2>
          <p className="page-subtitle">{total} mouvement{total !== 1 ? 's' : ''} enregistré{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setModal('ajustement')} className="btn-secondary">
            <SlidersHorizontal size={15} /> Ajustement
          </button>
          <button onClick={() => setModal('sortie')} className="btn-secondary text-red-600 border-red-200 hover:bg-red-50">
            <ArrowDown size={15} /> Sortie
          </button>
          <button onClick={() => setModal('entree')} className="btn-primary">
            <ArrowUp size={15} /> Entrée
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto-layout">
            <thead>
              <tr>
                <th>Type</th>
                <th>Produit</th>
                <th className="text-right">Qté</th>
                <th className="text-right">Avant</th>
                <th className="text-right">Après</th>
                <th>Référence</th>
                <th>Motif</th>
                <th>Auteur</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>{[...Array(9)].map((_, j) => (
                    <td key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : mouvements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    <Warehouse size={32} className="mx-auto mb-3 opacity-30" />
                    <p>Aucun mouvement enregistré</p>
                  </td>
                </tr>
              ) : (
                mouvements.map((m) => {
                  const cfg  = TYPE_CONFIG[m.type] || { label: m.type, icon: RefreshCw, cls: 'text-gray-500 bg-gray-50' };
                  const Icon = cfg.icon;
                  const isPositif = m.quantite > 0;
                  return (
                    <tr key={m.id}>
                      <td>
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${cfg.cls}`}>
                          <Icon size={12} />
                          {cfg.label}
                        </div>
                      </td>
                      <td>
                        <p className="font-medium text-gray-900 truncate max-w-[160px]">{m.produit_nom}</p>
                        <p className="text-xs text-gray-400">{m.produit_ref}</p>
                      </td>
                      <td className={`text-right font-bold ${isPositif ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositif ? '+' : ''}{m.quantite}
                      </td>
                      <td className="text-right text-gray-500">{m.stock_avant}</td>
                      <td className="text-right font-medium text-gray-900">{m.stock_apres}</td>
                      <td className="text-xs text-gray-500 font-mono">{m.reference_doc || '—'}</td>
                      <td className="text-sm text-gray-500 truncate max-w-[120px]">{m.motif || '—'}</td>
                      <td className="text-sm text-gray-500">{m.auteur_nom || '—'}</td>
                      <td className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(m.created_at).toLocaleString('fr-FR', { dateStyle:'short', timeStyle:'short' })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">{((page-1)*LIMIT)+1}–{Math.min(page*LIMIT,total)} sur {total}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1,p-1))} disabled={page===1}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">← Précédent</button>
              <span className="text-sm text-gray-600">Page {page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">Suivant →</button>
            </div>
          </div>
        )}
      </div>

      {modal === 'entree'      && <ModalEntree  onClose={() => setModal(null)} onSuccess={() => { setModal(null); fetchMouvements(); }} />}
      {modal === 'sortie'      && <ModalSortie  type="sortie"      onClose={() => setModal(null)} onSuccess={() => { setModal(null); fetchMouvements(); }} />}
      {modal === 'ajustement'  && <ModalSortie  type="ajustement"  onClose={() => setModal(null)} onSuccess={() => { setModal(null); fetchMouvements(); }} />}
    </div>
  );
}
