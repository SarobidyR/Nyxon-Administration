import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Package } from 'lucide-react';
import { produitsApi, categoriesApi, marquesApi, fournisseursApi } from '../../api/axios';
import useUiStore from '../../store/uiStore';
import toast      from 'react-hot-toast';

// ── Validation ────────────────────────────────────────────────
const schema = z.object({
  reference:      z.string().min(1, 'Référence requise'),
  nom:            z.string().min(1, 'Nom requis'),
  code_barre:     z.string().optional(),
  description:    z.string().optional(),
  marque_id:      z.string().optional(),
  categorie_id:   z.string().optional(),
  fournisseur_id: z.string().optional(),
  prix_achat_ht:  z.coerce.number().min(0, 'Prix achat invalide'),
  prix_vente_ht:  z.coerce.number().min(0, 'Prix vente invalide'),
  tva_taux:       z.coerce.number().min(0).max(100).default(20),
  stock_minimum:  z.coerce.number().int().min(0).default(5),
  stock_maximum:  z.coerce.number().int().min(0).optional().nullable(),
  poids_kg:       z.coerce.number().min(0).optional().nullable(),
  dimensions:     z.string().optional(),
  statut:         z.enum(['actif','inactif','rupture','discontinue']).default('actif'),
});

// ── Composants champs ─────────────────────────────────────────
const Field = ({ label, error, children, hint }) => (
  <div>
    <label className="label">{label}</label>
    {children}
    {hint  && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    {error && <p className="error-msg">{error}</p>}
  </div>
);

// ── Page formulaire ───────────────────────────────────────────
export default function ProduitsForm() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const isEdit       = Boolean(id);

  // Données des selects
  const [categories,   setCategories]   = useState([]);
  const [marques,      setMarques]      = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loadingForm,  setLoadingForm]  = useState(true);
  const [saving,       setSaving]       = useState(false);

  // Prévisualisation prix
  const [prixTTC, setPrixTTC] = useState(0);
  const [marge,   setMarge]   = useState(0);

  const {
    register, handleSubmit, reset, watch,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { tva_taux: 20, stock_minimum: 5, statut: 'actif' } });

  // Recalculer prix TTC et marge en live
  const watchPrixVente = watch('prix_vente_ht');
  const watchPrixAchat = watch('prix_achat_ht');
  const watchTva       = watch('tva_taux');

  useEffect(() => {
    const pv  = parseFloat(watchPrixVente) || 0;
    const pa  = parseFloat(watchPrixAchat) || 0;
    const tva = parseFloat(watchTva)       || 0;
    setPrixTTC(pv * (1 + tva / 100));
    setMarge(pv > 0 ? ((pv - pa) / pv) * 100 : 0);
  }, [watchPrixVente, watchPrixAchat, watchTva]);

  useEffect(() => {
    setPageTitle(isEdit ? 'Modifier le produit' : 'Nouveau produit');
  }, [isEdit, setPageTitle]);

  // Charger les données (selects + produit si édition)
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [catRes, marRes, fourRes] = await Promise.all([
          categoriesApi.getAll({ limit: 100 }),
          marquesApi.getAll({ limit: 100 }),
          fournisseursApi.getAll({ limit: 100 }),
        ]);
        setCategories(catRes.data.data   || []);
        setMarques(marRes.data.data      || []);
        setFournisseurs(fourRes.data.data || []);

        if (isEdit) {
          const { data: res } = await produitsApi.getOne(id);
          const p = res.data;
          reset({
            reference:      p.reference,
            nom:            p.nom,
            code_barre:     p.code_barre    || '',
            description:    p.description   || '',
            marque_id:      p.marque_id     || '',
            categorie_id:   p.categorie_id  || '',
            fournisseur_id: p.fournisseur_id || '',
            prix_achat_ht:  p.prix_achat_ht,
            prix_vente_ht:  p.prix_vente_ht,
            tva_taux:       p.tva_taux,
            stock_minimum:  p.stock_minimum,
            stock_maximum:  p.stock_maximum || '',
            poids_kg:       p.poids_kg      || '',
            dimensions:     p.dimensions    || '',
            statut:         p.statut,
          });
        }
      } catch (err) {
        toast.error('Erreur de chargement');
      } finally {
        setLoadingForm(false);
      }
    };
    loadAll();
  }, [id, isEdit, reset]);

  // Soumission
  const onSubmit = async (data) => {
    setSaving(true);
    try {
      // Nettoyer les champs vides optionnels
      const payload = { ...data };
      ['marque_id','categorie_id','fournisseur_id','code_barre',
       'description','dimensions'].forEach((k) => {
        if (!payload[k]) payload[k] = null;
      });
      ['stock_maximum','poids_kg'].forEach((k) => {
        payload[k] = payload[k] ? parseFloat(payload[k]) : null;
      });

      if (isEdit) {
        await produitsApi.update(id, payload);
        toast.success('Produit mis à jour');
      } else {
        await produitsApi.create(payload);
        toast.success('Produit créé');
      }
      navigate('/produits');
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loadingForm) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* En-tête */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/produits')} className="btn-ghost p-2">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="page-title">
              {isEdit ? 'Modifier le produit' : 'Nouveau produit'}
            </h2>
            <p className="page-subtitle">
              {isEdit ? 'Mettre à jour les informations' : 'Ajouter un produit au catalogue'}
            </p>
          </div>
        </div>
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={saving}
          className="btn-primary"
        >
          {saving
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sauvegarde…</>
            : <><Save size={16} /> {isEdit ? 'Mettre à jour' : 'Créer le produit'}</>
          }
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Colonne principale ─────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Informations générales */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Package size={16} className="text-sky-500" />
                Informations générales
              </h3>
            </div>
            <div className="card-body space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nom du produit *" error={errors.nom?.message}>
                  <input {...register('nom')} className={`input-field ${errors.nom ? 'input-error' : ''}`}
                    placeholder="Ex: T-Shirt Nike Dry-Fit" />
                </Field>
                <Field label="Référence *" error={errors.reference?.message}>
                  <input {...register('reference')} className={`input-field ${errors.reference ? 'input-error' : ''}`}
                    placeholder="Ex: VET-001" />
                </Field>
              </div>

              <Field label="Description" error={errors.description?.message}>
                <textarea {...register('description')} rows={3}
                  className="input-field resize-none"
                  placeholder="Description détaillée du produit…" />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Catégorie">
                  <select {...register('categorie_id')} className="input-field appearance-none">
                    <option value="">— Aucune —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.nom}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Marque">
                  <select {...register('marque_id')} className="input-field appearance-none">
                    <option value="">— Aucune —</option>
                    {marques.map((m) => (
                      <option key={m.id} value={m.id}>{m.nom}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Fournisseur">
                  <select {...register('fournisseur_id')} className="input-field appearance-none">
                    <option value="">— Aucun —</option>
                    {fournisseurs.map((f) => (
                      <option key={f.id} value={f.id}>{f.raison_sociale}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Code-barre (EAN, QR…)" error={errors.code_barre?.message}>
                <input {...register('code_barre')} className="input-field"
                  placeholder="Ex: 3700123456789" />
              </Field>
            </div>
          </div>

          {/* Prix */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-900">Prix & TVA</h3>
              {/* Résumé live */}
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500">
                  TTC : <span className="font-semibold text-gray-900">
                    {prixTTC.toLocaleString('fr-MG', { maximumFractionDigits: 0 })} Ar
                  </span>
                </span>
                <span className={`font-semibold ${marge > 30 ? 'text-green-600' : marge > 10 ? 'text-amber-600' : 'text-red-500'}`}>
                  Marge : {marge.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Prix d'achat HT (Ar) *" error={errors.prix_achat_ht?.message}>
                  <input {...register('prix_achat_ht')} type="number" step="0.01" min="0"
                    className={`input-field ${errors.prix_achat_ht ? 'input-error' : ''}`}
                    placeholder="0" />
                </Field>
                <Field label="Prix de vente HT (Ar) *" error={errors.prix_vente_ht?.message}>
                  <input {...register('prix_vente_ht')} type="number" step="0.01" min="0"
                    className={`input-field ${errors.prix_vente_ht ? 'input-error' : ''}`}
                    placeholder="0" />
                </Field>
                <Field label="TVA (%)" error={errors.tva_taux?.message}
                  hint="0 pour les produits exonérés">
                  <input {...register('tva_taux')} type="number" step="0.01" min="0" max="100"
                    className="input-field" placeholder="20" />
                </Field>
              </div>
            </div>
          </div>

          {/* Caractéristiques physiques */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-900">Caractéristiques physiques</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Poids (kg)" error={errors.poids_kg?.message}>
                  <input {...register('poids_kg')} type="number" step="0.001" min="0"
                    className="input-field" placeholder="0.500" />
                </Field>
                <Field label="Dimensions" error={errors.dimensions?.message}
                  hint="Format : L x l x H cm">
                  <input {...register('dimensions')} className="input-field"
                    placeholder="Ex: 30 x 20 x 5 cm" />
                </Field>
              </div>
            </div>
          </div>
        </div>

        {/* ── Colonne latérale ───────────────────────────────── */}
        <div className="space-y-6">

          {/* Statut */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-900">Statut</h3>
            </div>
            <div className="card-body">
              <Field label="État du produit" error={errors.statut?.message}>
                <select {...register('statut')} className="input-field appearance-none">
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                  <option value="rupture">Rupture</option>
                  <option value="discontinue">Discontinué</option>
                </select>
              </Field>
            </div>
          </div>

          {/* Stock */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-900">Seuils de stock</h3>
            </div>
            <div className="card-body space-y-4">
              <Field label="Stock minimum *" error={errors.stock_minimum?.message}
                hint="Alerte déclenchée en dessous de ce seuil">
                <input {...register('stock_minimum')} type="number" min="0"
                  className={`input-field ${errors.stock_minimum ? 'input-error' : ''}`}
                  placeholder="5" />
              </Field>
              <Field label="Stock maximum" error={errors.stock_maximum?.message}
                hint="Optionnel — limite de surstock">
                <input {...register('stock_maximum')} type="number" min="0"
                  className="input-field" placeholder="—" />
              </Field>

              {!isEdit && (
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
                  <p className="text-xs text-sky-700">
                    Le stock initial sera à 0. Utilisez les entrées de stock pour approvisionner le produit.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="card">
            <div className="card-body space-y-3">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full justify-center"
              >
                {saving
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sauvegarde…</>
                  : <><Save size={16} /> {isEdit ? 'Mettre à jour' : 'Créer le produit'}</>
                }
              </button>
              <button
                type="button"
                onClick={() => navigate('/produits')}
                className="btn-secondary w-full justify-center"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
