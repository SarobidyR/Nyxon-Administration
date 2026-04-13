import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { marquesApi } from '../../api/axios';
import useUiStore from '../../store/uiStore';
import toast      from 'react-hot-toast';

const schema = z.object({
  nom:         z.string().min(1,'Nom requis'),
  description: z.string().optional(),
  logo_url:    z.string().url('URL invalide').optional().or(z.literal('')),
  site_web:    z.string().url('URL invalide').optional().or(z.literal('')),
});

const Field = ({ label, error, hint, children }) => (
  <div>
    <label className="label">{label}</label>
    {children}
    {hint  && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    {error && <p className="error-msg">{error}</p>}
  </div>
);

export default function MarquesForm() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const isEdit       = Boolean(id);
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const { register, handleSubmit, reset, formState:{errors} } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => { setPageTitle(isEdit ? 'Modifier la marque' : 'Nouvelle marque'); }, [isEdit, setPageTitle]);

  useEffect(() => {
    if (!isEdit) return;
    marquesApi.getOne(id)
      .then(({ data:res }) => reset({ ...res.data, logo_url:res.data.logo_url||'', site_web:res.data.site_web||'' }))
      .catch(() => { toast.error('Introuvable'); navigate('/marques'); })
      .finally(() => setLoading(false));
  }, [id, isEdit, reset, navigate]);

  const onSubmit = async (data) => {
    setSaving(true);
    const payload = { ...data };
    ['logo_url','site_web','description'].forEach((k) => { if (!payload[k]) payload[k] = null; });
    try {
      if (isEdit) {
        await marquesApi.update(id, payload);
        toast.success('Marque mise à jour');
      } else {
        await marquesApi.create(payload);
        toast.success('Marque créée');
      }
      navigate('/marques');
    } catch (err) { toast.error(err.message||'Erreur'); }
    finally { setSaving(false); }
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
          <button onClick={() => navigate('/marques')} className="btn-ghost p-2"><ArrowLeft size={18}/></button>
          <div>
            <h2 className="page-title">{isEdit ? 'Modifier la marque' : 'Nouvelle marque'}</h2>
          </div>
        </div>
        <button onClick={handleSubmit(onSubmit)} disabled={saving} className="btn-primary">
          {saving ? 'Sauvegarde…' : <><Save size={16}/>{isEdit ? 'Mettre à jour' : 'Créer'}</>}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl">
        <div className="card">
          <div className="card-body space-y-4">
            <Field label="Nom de la marque *" error={errors.nom?.message}>
              <input {...register('nom')} className={`input-field ${errors.nom?'input-error':''}`} placeholder="Ex: Nike" />
            </Field>
            <Field label="Description" error={errors.description?.message}>
              <textarea {...register('description')} rows={3} className="input-field resize-none" placeholder="Décrivez la marque…"/>
            </Field>
            <Field label="URL du logo" error={errors.logo_url?.message} hint="Lien direct vers l'image (https://…)">
              <input {...register('logo_url')} className="input-field" placeholder="https://exemple.com/logo.png"/>
            </Field>
            <Field label="Site web" error={errors.site_web?.message}>
              <input {...register('site_web')} className="input-field" placeholder="https://www.marque.com"/>
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => navigate('/marques')} className="btn-secondary flex-1">Annuler</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Sauvegarde…' : isEdit ? 'Mettre à jour' : 'Créer la marque'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
