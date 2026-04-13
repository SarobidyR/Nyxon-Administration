import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { fournisseursApi } from '../../api/axios';
import useUiStore from '../../store/uiStore';
import toast      from 'react-hot-toast';

const schema = z.object({
  raison_sociale:      z.string().min(1,'Requis'),
  contact_nom:         z.string().optional(),
  contact_email:       z.string().email('Email invalide').optional().or(z.literal('')),
  contact_tel:         z.string().optional(),
  adresse:             z.string().optional(),
  ville:               z.string().optional(),
  pays:                z.string().optional(),
  code_postal:         z.string().optional(),
  num_tva:             z.string().optional(),
  conditions_paiement: z.string().optional(),
  delai_livraison:     z.coerce.number().int().min(0).optional().nullable(),
  note:                z.coerce.number().min(0).max(5).optional().nullable(),
  notes:               z.string().optional(),
});

const Field = ({ label, error, hint, children }) => (
  <div>
    <label className="label">{label}</label>
    {children}
    {hint  && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    {error && <p className="error-msg">{error}</p>}
  </div>
);

export default function FournisseursForm() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const isEdit       = Boolean(id);
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const { register, handleSubmit, reset, formState:{errors} } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { pays:'Madagascar' },
  });

  useEffect(() => { setPageTitle(isEdit ? 'Modifier le fournisseur' : 'Nouveau fournisseur'); }, [isEdit, setPageTitle]);

  useEffect(() => {
    if (!isEdit) return;
    fournisseursApi.getOne(id)
      .then(({ data:res }) => reset({ ...res.data, contact_email: res.data.contact_email||'' }))
      .catch(() => { toast.error('Introuvable'); navigate('/fournisseurs'); })
      .finally(() => setLoading(false));
  }, [id, isEdit, reset, navigate]);

  const onSubmit = async (data) => {
    setSaving(true);
    const payload = { ...data };
    ['contact_nom','contact_email','contact_tel','adresse','ville','code_postal',
     'num_tva','conditions_paiement','notes'].forEach((k) => { if (!payload[k]) payload[k] = null; });
    ['delai_livraison','note'].forEach((k) => { payload[k] = payload[k]||payload[k]===0 ? payload[k] : null; });
    try {
      if (isEdit) {
        await fournisseursApi.update(id, payload);
        toast.success('Fournisseur mis à jour');
      } else {
        await fournisseursApi.create(payload);
        toast.success('Fournisseur créé');
      }
      navigate('/fournisseurs');
    } catch (err) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/fournisseurs')} className="btn-ghost p-2"><ArrowLeft size={18}/></button>
          <div>
            <h2 className="page-title">{isEdit ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</h2>
            <p className="page-subtitle">{isEdit ? 'Mettre à jour' : 'Ajouter un fournisseur'}</p>
          </div>
        </div>
        <button onClick={handleSubmit(onSubmit)} disabled={saving} className="btn-primary">
          {saving ? 'Sauvegarde…' : <><Save size={16}/>{isEdit ? 'Mettre à jour' : 'Créer'}</>}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-header"><h3 className="text-sm font-semibold">Informations générales</h3></div>
            <div className="card-body space-y-4">
              <Field label="Raison sociale *" error={errors.raison_sociale?.message}>
                <input {...register('raison_sociale')} className="input-field" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="N° TVA"><input {...register('num_tva')} className="input-field"/></Field>
                <Field label="Conditions de paiement" hint="Ex: 30 jours net">
                  <input {...register('conditions_paiement')} className="input-field" placeholder="30 jours net"/>
                </Field>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="text-sm font-semibold">Contact</h3></div>
            <div className="card-body space-y-4">
              <Field label="Nom du contact"><input {...register('contact_nom')} className="input-field"/></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Email" error={errors.contact_email?.message}>
                  <input {...register('contact_email')} type="email" className="input-field"/>
                </Field>
                <Field label="Téléphone">
                  <input {...register('contact_tel')} className="input-field" placeholder="+261…"/>
                </Field>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h3 className="text-sm font-semibold">Adresse</h3></div>
            <div className="card-body space-y-4">
              <Field label="Adresse"><input {...register('adresse')} className="input-field"/></Field>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Code postal"><input {...register('code_postal')} className="input-field"/></Field>
                <Field label="Ville"><input {...register('ville')} className="input-field"/></Field>
                <Field label="Pays"><input {...register('pays')} className="input-field"/></Field>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="card-header"><h3 className="text-sm font-semibold">Logistique</h3></div>
            <div className="card-body space-y-4">
              <Field label="Délai de livraison (jours)" hint="Délai moyen en jours">
                <input {...register('delai_livraison')} type="number" min="0" className="input-field" placeholder="7"/>
              </Field>
              <Field label="Note (0 à 5)" error={errors.note?.message} hint="Qualité globale du fournisseur">
                <input {...register('note')} type="number" min="0" max="5" step="0.5" className="input-field" placeholder="3.5"/>
              </Field>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><h3 className="text-sm font-semibold">Notes internes</h3></div>
            <div className="card-body">
              <textarea {...register('notes')} rows={4} className="input-field resize-none" placeholder="Observations…"/>
            </div>
          </div>
          <div className="card">
            <div className="card-body space-y-3">
              <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
                {saving ? 'Sauvegarde…' : <><Save size={16}/>{isEdit ? 'Mettre à jour' : 'Créer'}</>}
              </button>
              <button type="button" onClick={() => navigate('/fournisseurs')} className="btn-secondary w-full justify-center">Annuler</button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
