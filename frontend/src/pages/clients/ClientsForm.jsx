import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, User, Building2 } from 'lucide-react';
import { clientsApi } from '../../api/axios';
import useUiStore from '../../store/uiStore';
import toast      from 'react-hot-toast';

const schema = z.object({
  type:           z.enum(['particulier','professionnel']),
  nom:            z.string().optional(),
  prenom:         z.string().optional(),
  raison_sociale: z.string().optional(),
  num_tva:        z.string().optional(),
  siret:          z.string().optional(),
  email:          z.string().email('Email invalide').optional().or(z.literal('')),
  telephone:      z.string().optional(),
  adresse:        z.string().optional(),
  ville:          z.string().optional(),
  code_postal:    z.string().optional(),
  pays:           z.string().optional(),
  notes:          z.string().optional(),
}).refine((d) => {
  if (d.type === 'particulier')   return !!(d.nom || d.prenom);
  if (d.type === 'professionnel') return !!d.raison_sociale;
  return true;
}, { message: 'Nom/prénom requis pour particulier, raison sociale pour professionnel', path:['nom'] });

const Field = ({ label, error, children, hint }) => (
  <div>
    <label className="label">{label}</label>
    {children}
    {hint  && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    {error && <p className="error-msg">{error}</p>}
  </div>
);

export default function ClientsForm() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const isEdit       = Boolean(id);
  const [saving,   setSaving]   = useState(false);
  const [loading,  setLoading]  = useState(isEdit);

  const { register, handleSubmit, watch, setValue, reset, formState:{ errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { type:'particulier', pays:'Madagascar' },
  });

  const typeValue = watch('type');

  useEffect(() => { setPageTitle(isEdit ? 'Modifier le client' : 'Nouveau client'); }, [isEdit, setPageTitle]);

  useEffect(() => {
    if (!isEdit) return;
    clientsApi.getOne(id)
      .then(({ data: res }) => { reset({ ...res.data, email: res.data.email || '' }); })
      .catch(() => { toast.error('Client introuvable'); navigate('/clients'); })
      .finally(() => setLoading(false));
  }, [id, isEdit, reset, navigate]);

  const onSubmit = async (data) => {
    setSaving(true);
    const payload = { ...data };
    ['nom','prenom','raison_sociale','num_tva','siret','email','telephone',
     'adresse','ville','code_postal','notes'].forEach((k) => {
      if (!payload[k]) payload[k] = null;
    });
    try {
      if (isEdit) {
        await clientsApi.update(id, payload);
        toast.success('Client mis à jour');
      } else {
        await clientsApi.create(payload);
        toast.success('Client créé');
      }
      navigate('/clients');
    } catch (err) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/clients')} className="btn-ghost p-2"><ArrowLeft size={18}/></button>
          <div>
            <h2 className="page-title">{isEdit ? 'Modifier le client' : 'Nouveau client'}</h2>
            <p className="page-subtitle">{isEdit ? 'Mettre à jour les informations' : 'Ajouter un client'}</p>
          </div>
        </div>
        <button onClick={handleSubmit(onSubmit)} disabled={saving} className="btn-primary">
          {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Sauvegarde…</> : <><Save size={16}/>{isEdit ? 'Mettre à jour' : 'Créer'}</>}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Type */}
          <div className="card">
            <div className="card-header"><h3 className="text-sm font-semibold text-gray-900">Type de client</h3></div>
            <div className="card-body">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { val:'particulier',   label:'Particulier',   icon:User,      desc:'Personne physique' },
                  { val:'professionnel', label:'Professionnel', icon:Building2, desc:'Entreprise / société' },
                ].map(({ val, label, icon:Icon, desc }) => (
                  <label key={val} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    typeValue === val ? 'border-sky-500 bg-sky-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input type="radio" {...register('type')} value={val} className="sr-only" />
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      typeValue === val ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${typeValue===val?'text-sky-700':'text-gray-700'}`}>{label}</p>
                      <p className="text-xs text-gray-400">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Identité */}
          <div className="card">
            <div className="card-header"><h3 className="text-sm font-semibold text-gray-900">Identité</h3></div>
            <div className="card-body space-y-4">
              {typeValue === 'particulier' ? (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Prénom" error={errors.prenom?.message}>
                    <input {...register('prenom')} className="input-field" placeholder="Jean" />
                  </Field>
                  <Field label="Nom" error={errors.nom?.message}>
                    <input {...register('nom')} className="input-field" placeholder="Rakoto" />
                  </Field>
                </div>
              ) : (
                <>
                  <Field label="Raison sociale *" error={errors.raison_sociale?.message}>
                    <input {...register('raison_sociale')} className="input-field" placeholder="Ma Société SARL" />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="N° TVA" error={errors.num_tva?.message}>
                      <input {...register('num_tva')} className="input-field" placeholder="MG…" />
                    </Field>
                    <Field label="SIRET / Registre" error={errors.siret?.message}>
                      <input {...register('siret')} className="input-field" />
                    </Field>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field label="Email" error={errors.email?.message}>
                  <input {...register('email')} type="email" className="input-field" placeholder="email@exemple.mg" />
                </Field>
                <Field label="Téléphone">
                  <input {...register('telephone')} className="input-field" placeholder="+261 34…" />
                </Field>
              </div>
            </div>
          </div>

          {/* Adresse */}
          <div className="card">
            <div className="card-header"><h3 className="text-sm font-semibold text-gray-900">Adresse</h3></div>
            <div className="card-body space-y-4">
              <Field label="Adresse">
                <input {...register('adresse')} className="input-field" placeholder="Rue, quartier…" />
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Code postal">
                  <input {...register('code_postal')} className="input-field" />
                </Field>
                <Field label="Ville" error={errors.ville?.message}>
                  <input {...register('ville')} className="input-field" placeholder="Antananarivo" />
                </Field>
                <Field label="Pays">
                  <input {...register('pays')} className="input-field" defaultValue="Madagascar" />
                </Field>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          <div className="card">
            <div className="card-header"><h3 className="text-sm font-semibold text-gray-900">Notes</h3></div>
            <div className="card-body">
              <textarea {...register('notes')} rows={5} className="input-field resize-none"
                placeholder="Informations complémentaires…" />
            </div>
          </div>
          <div className="card">
            <div className="card-body space-y-3">
              <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
                {saving ? 'Sauvegarde…' : <><Save size={16}/>{isEdit ? 'Mettre à jour' : 'Créer le client'}</>}
              </button>
              <button type="button" onClick={() => navigate('/clients')} className="btn-secondary w-full justify-center">
                Annuler
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
