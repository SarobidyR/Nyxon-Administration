import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, Package, Tag, Truck, FolderOpen, TrendingUp } from 'lucide-react';
import { produitsApi } from '../../api/axios';
import useUiStore   from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import toast        from 'react-hot-toast';

const InfoRow = ({ label, value }) => (
  <div className="flex items-start justify-between py-2.5 border-b border-gray-100 last:border-0">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-sm font-medium text-gray-900 text-right ml-4">{value || '—'}</span>
  </div>
);

export default function ProduitDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const hasRole      = useAuthStore((s) => s.hasRole);
  const canEdit      = hasRole('manager');

  const [produit,  setProduit]  = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => { setPageTitle('Fiche produit'); }, [setPageTitle]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: res } = await produitsApi.getOne(id);
        setProduit(res.data);
      } catch (err) {
        toast.error('Produit introuvable');
        navigate('/produits');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!produit) return null;

  const marge = produit.prix_vente_ht > 0
    ? ((produit.prix_vente_ht - produit.prix_achat_ht) / produit.prix_vente_ht) * 100
    : 0;

  const etatStock = produit.stock_actuel <= 0
    ? { label: 'Rupture', cls: 'badge-red' }
    : produit.stock_actuel <= produit.stock_minimum
      ? { label: 'Alerte', cls: 'badge-amber' }
      : { label: 'OK', cls: 'badge-green' };

  return (
    <div>
      {/* En-tête */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/produits')} className="btn-ghost p-2">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="page-title">{produit.nom}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">
                {produit.reference}
              </code>
              <span className={`badge ${etatStock.cls}`}>{etatStock.label}</span>
            </div>
          </div>
        </div>
        {canEdit && (
          <button onClick={() => navigate(`/produits/${id}/edit`)} className="btn-primary">
            <Edit2 size={16} /> Modifier
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Colonne principale ─────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Prix TTC',    value: `${Number(produit.prix_vente_ttc).toLocaleString('fr-MG', { maximumFractionDigits: 0 })} Ar` },
              { label: 'Prix achat',  value: `${Number(produit.prix_achat_ht).toLocaleString('fr-MG',  { maximumFractionDigits: 0 })} Ar` },
              { label: 'Stock actuel',value: produit.stock_actuel },
              { label: 'Marge',       value: `${marge.toFixed(1)}%`, color: marge > 30 ? 'text-green-600' : marge > 10 ? 'text-amber-600' : 'text-red-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card p-4">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-lg font-semibold ${color || 'text-gray-900'}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Informations */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-900">Informations</h3>
            </div>
            <div className="card-body">
              {produit.description && (
                <p className="text-sm text-gray-600 mb-4 pb-4 border-b border-gray-100">
                  {produit.description}
                </p>
              )}
              <InfoRow label="Code-barre"   value={produit.code_barre} />
              <InfoRow label="TVA"          value={`${produit.tva_taux}%`} />
              <InfoRow label="Statut"       value={produit.statut} />
              <InfoRow label="Poids"        value={produit.poids_kg ? `${produit.poids_kg} kg` : null} />
              <InfoRow label="Dimensions"   value={produit.dimensions} />
              <InfoRow label="Créé le"      value={new Date(produit.created_at).toLocaleDateString('fr-FR', { dateStyle: 'long' })} />
            </div>
          </div>
        </div>

        {/* ── Colonne latérale ───────────────────────────────── */}
        <div className="space-y-6">

          {/* Catégorie & Marque */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-900">Catalogue</h3>
            </div>
            <div className="card-body space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
                  <FolderOpen size={15} className="text-sky-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Catégorie</p>
                  <p className="text-sm font-medium text-gray-900">{produit.categorie_nom || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Tag size={15} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Marque</p>
                  <p className="text-sm font-medium text-gray-900">{produit.marque_nom || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Truck size={15} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Fournisseur</p>
                  <p className="text-sm font-medium text-gray-900">{produit.fournisseur_nom || '—'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stock */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-900">Stock</h3>
            </div>
            <div className="card-body space-y-3">
              {/* Barre de stock */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Stock actuel</span>
                  <span className="font-medium text-gray-900">{produit.stock_actuel} unités</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      produit.stock_actuel <= 0 ? 'bg-red-500' :
                      produit.stock_actuel <= produit.stock_minimum ? 'bg-amber-400' : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min(100,
                        produit.stock_maximum
                          ? (produit.stock_actuel / produit.stock_maximum) * 100
                          : Math.min(100, (produit.stock_actuel / (produit.stock_minimum * 3)) * 100)
                      )}%`
                    }}
                  />
                </div>
              </div>
              <InfoRow label="Seuil minimum"  value={`${produit.stock_minimum} unités`} />
              <InfoRow label="Seuil maximum"  value={produit.stock_maximum ? `${produit.stock_maximum} unités` : null} />
              <InfoRow label="Valeur stock"   value={`${(produit.stock_actuel * produit.prix_achat_ht).toLocaleString('fr-MG', { maximumFractionDigits: 0 })} Ar`} />
            </div>
          </div>

          {/* Rentabilité */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp size={15} className="text-sky-500" />
                Rentabilité
              </h3>
            </div>
            <div className="card-body">
              <InfoRow label="Marge unitaire HT" value={`${(produit.prix_vente_ht - produit.prix_achat_ht).toLocaleString('fr-MG', { maximumFractionDigits: 0 })} Ar`} />
              <InfoRow label="Taux de marge"     value={<span className={marge > 30 ? 'text-green-600' : marge > 10 ? 'text-amber-600' : 'text-red-500'}>{marge.toFixed(1)}%</span>} />
              <InfoRow label="Marge potentielle" value={`${((produit.prix_vente_ht - produit.prix_achat_ht) * produit.stock_actuel).toLocaleString('fr-MG', { maximumFractionDigits: 0 })} Ar`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
