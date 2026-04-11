import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, KeyRound, Store } from 'lucide-react';
import api         from '../../api/axios';
import useUiStore  from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import toast        from 'react-hot-toast';

const passwordSchema = z.object({
  ancienPassword:   z.string().min(1,'Requis'),
  nouveauPassword:  z.string().min(8,'8 caractères minimum'),
  confirmPassword:  z.string().min(8,'Requis'),
}).refine((d) => d.nouveauPassword === d.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path:    ['confirmPassword'],
});

const Field = ({ label, error, hint, children }) => (
  <div>
    <label className="label">{label}</label>
    {children}
    {hint  && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    {error && <p className="error-msg">{error}</p>}
  </div>
);

export default function Settings() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const isSuperAdmin = useAuthStore((s) => s.hasRole('superadmin'));
  const logout       = useAuthStore((s) => s.logout);

  const [config,       setConfig]       = useState({});
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig,  setSavingConfig]  = useState(false);
  const [savingPwd,     setSavingPwd]     = useState(false);

  useEffect(() => { setPageTitle('Paramètres'); }, [setPageTitle]);

  // Charger config boutique
  useEffect(() => {
    if (!isSuperAdmin) { setLoadingConfig(false); return; }
    api.get('/admin/stats')
      .then(({ data: r }) => {
        const map = Object.fromEntries((r.data.config||[]).map((c) => [c.cle, c.valeur]));
        setConfig(map);
      })
      .catch(() => {})
      .finally(() => setLoadingConfig(false));
  }, [isSuperAdmin]);

  const handleConfigChange = (k, v) => setConfig((prev) => ({ ...prev, [k]: v }));

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      await api.put('/admin/config', config);
      toast.success('Configuration sauvegardée');
    } catch (err) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSavingConfig(false);
    }
  };

  // Formulaire mot de passe
  const { register, handleSubmit, reset, formState:{ errors } } = useForm({
    resolver: zodResolver(passwordSchema),
  });

  const changePassword = async (data) => {
    setSavingPwd(true);
    try {
      await api.patch('/auth/change-password', {
        ancienPassword:  data.ancienPassword,
        nouveauPassword: data.nouveauPassword,
      });
      toast.success('Mot de passe modifié. Reconnexion requise…');
      reset();
      setTimeout(() => logout(), 1500);
    } catch (err) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="page-header">
        <div>
          <h2 className="page-title">Paramètres</h2>
          <p className="page-subtitle">Configuration de votre compte et de la boutique</p>
        </div>
      </div>

      {/* Config boutique — superadmin seulement */}
      {isSuperAdmin && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Store size={15} className="text-sky-500"/> Configuration boutique
            </h3>
          </div>
          <div className="card-body space-y-4">
            {loadingConfig ? (
              <div className="space-y-3">
                {[...Array(4)].map((_,i) => <div key={i} className="h-10 bg-gray-50 rounded animate-pulse"/>)}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Nom de la boutique">
                    <input value={config.boutique_nom||''} onChange={(e)=>handleConfigChange('boutique_nom',e.target.value)}
                      className="input-field" placeholder="Nyxon" />
                  </Field>
                  <Field label="Devise (ISO 4217)">
                    <input value={config.devise||''} onChange={(e)=>handleConfigChange('devise',e.target.value)}
                      className="input-field" placeholder="MGA" />
                  </Field>
                </div>
                <Field label="Adresse">
                  <input value={config.boutique_adresse||''} onChange={(e)=>handleConfigChange('boutique_adresse',e.target.value)}
                    className="input-field" placeholder="Antananarivo, Madagascar" />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Téléphone">
                    <input value={config.boutique_tel||''} onChange={(e)=>handleConfigChange('boutique_tel',e.target.value)}
                      className="input-field" placeholder="+261 20 22 …" />
                  </Field>
                  <Field label="Email de contact">
                    <input value={config.boutique_email||''} onChange={(e)=>handleConfigChange('boutique_email',e.target.value)}
                      className="input-field" placeholder="contact@boutique.mg" />
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="TVA par défaut (%)" hint="Appliqué aux nouveaux produits">
                    <input value={config.tva_defaut||''} onChange={(e)=>handleConfigChange('tva_defaut',e.target.value)}
                      type="number" min="0" max="100" className="input-field" />
                  </Field>
                  <Field label="Préfixe numéros de commande">
                    <input value={config.numero_cmd_prefix||''} onChange={(e)=>handleConfigChange('numero_cmd_prefix',e.target.value)}
                      className="input-field" placeholder="CMD" />
                  </Field>
                </div>
                <Field label="Message pied de ticket">
                  <input value={config.ticket_message||''} onChange={(e)=>handleConfigChange('ticket_message',e.target.value)}
                    className="input-field" placeholder="Merci de votre visite !" />
                </Field>
                <div className="pt-2 flex justify-end">
                  <button onClick={saveConfig} disabled={savingConfig} className="btn-primary">
                    {savingConfig
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Sauvegarde…</>
                      : <><Save size={15}/>Sauvegarder la config</>
                    }
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Changer mot de passe */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <KeyRound size={15} className="text-sky-500"/> Changer mon mot de passe
          </h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit(changePassword)} className="space-y-4">
            <Field label="Mot de passe actuel" error={errors.ancienPassword?.message}>
              <input {...register('ancienPassword')} type="password"
                className={`input-field ${errors.ancienPassword?'input-error':''}`}
                autoComplete="current-password" />
            </Field>
            <Field label="Nouveau mot de passe" error={errors.nouveauPassword?.message}>
              <input {...register('nouveauPassword')} type="password"
                className={`input-field ${errors.nouveauPassword?'input-error':''}`}
                autoComplete="new-password" placeholder="8 caractères minimum" />
            </Field>
            <Field label="Confirmer le nouveau mot de passe" error={errors.confirmPassword?.message}>
              <input {...register('confirmPassword')} type="password"
                className={`input-field ${errors.confirmPassword?'input-error':''}`}
                autoComplete="new-password" />
            </Field>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700">
                Après changement, vous serez déconnecté et devrez vous reconnecter avec le nouveau mot de passe.
              </p>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={savingPwd} className="btn-primary">
                {savingPwd
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Modification…</>
                  : <><KeyRound size={15}/>Modifier le mot de passe</>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
