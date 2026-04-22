import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, KeyRound, Shield, Clock, Edit2, Check, X, User } from 'lucide-react';
import api          from '../../api/axios';
import useUiStore   from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import toast        from 'react-hot-toast';

const profileSchema = z.object({
  nom:    z.string().min(1, 'Requis'),
  prenom: z.string().min(1, 'Requis'),
  email:  z.string().email('Email invalide'),
});

const passwordSchema = z.object({
  ancienPassword:  z.string().min(1, 'Requis'),
  nouveauPassword: z.string().min(8, '8 caractères minimum'),
  confirmPassword: z.string().min(1, 'Requis'),
}).refine((d) => d.nouveauPassword === d.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

const ROLE_CONFIG = {
  superadmin: { label:'Super Admin', cls:'bg-purple-100 text-purple-700' },
  admin:      { label:'Admin',       cls:'bg-sky-100    text-sky-700'    },
  manager:    { label:'Manager',     cls:'bg-green-100  text-green-700'  },
  vendeur:    { label:'Vendeur',     cls:'bg-amber-100  text-amber-700'  },
  lecteur:    { label:'Lecteur',     cls:'bg-gray-100   text-gray-600'   },
};

const Field = ({ label, error, children }) => (
  <div>
    <label className="label">{label}</label>
    {children}
    {error && <p className="error-msg">{error}</p>}
  </div>
);

function BigAvatar({ user, size = 72 }) {
  const initiales = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase();
  const palettes  = ['bg-sky-500','bg-purple-500','bg-green-500','bg-amber-500','bg-pink-500','bg-teal-500'];
  const idx       = (user?.nom?.charCodeAt(0) || 0) % palettes.length;
  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${palettes[idx]}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.35) }}
    >
      {initiales || <User size={Math.round(size * 0.4)} />}
    </div>
  );
}

export default function UserProfile() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const currentUser  = useAuthStore((s) => s.user);
  const fetchMe      = useAuthStore((s) => s.fetchMe);
  const logout       = useAuthStore((s) => s.logout);

  const [editing,       setEditing]       = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd,     setSavingPwd]     = useState(false);
  const [nbCommandes,   setNbCommandes]   = useState(null);

  useEffect(() => { setPageTitle('Mon profil'); }, [setPageTitle]);

  useEffect(() => {
    if (!currentUser) return;
    api.get('/commandes', { params: { limit: 1 } })
      .then(({ data: r }) => setNbCommandes(r.total ?? 0))
      .catch(() => setNbCommandes(0));
  }, [currentUser?.id]);

  // ── Formulaire profil ─────────────────────────────────────
  const { register: regP, handleSubmit: submitP, reset: resetP, formState: { errors: errP } } =
    useForm({ resolver: zodResolver(profileSchema) });

  const startEdit = () => {
    resetP({ nom: currentUser?.nom || '', prenom: currentUser?.prenom || '', email: currentUser?.email || '' });
    setEditing(true);
  };

  const onSaveProfile = async (data) => {
    setSavingProfile(true);
    try {
      // ✅ Endpoint accessible à tous les rôles — pas besoin d'être admin
      await api.patch('/auth/profile', data);
      await fetchMe();
      toast.success('Profil mis à jour');
      setEditing(false);
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Formulaire mot de passe ───────────────────────────────
  const { register: regPwd, handleSubmit: submitPwd, reset: resetPwd, formState: { errors: errPwd } } =
    useForm({ resolver: zodResolver(passwordSchema) });

  const onChangePassword = async (data) => {
    setSavingPwd(true);
    try {
      await api.patch('/auth/change-password', {
        ancienPassword:  data.ancienPassword,
        nouveauPassword: data.nouveauPassword,
      });
      toast.success('Mot de passe modifié — reconnexion dans 2s…');
      resetPwd();
      setTimeout(() => logout(), 2000);
    } catch (err) {
      toast.error(err.message || 'Mot de passe actuel incorrect');
    } finally {
      setSavingPwd(false);
    }
  };

  if (!currentUser) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  const roleConf = ROLE_CONFIG[currentUser.role] || ROLE_CONFIG.lecteur;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="page-title">Mon profil</h2>
        <p className="page-subtitle">Vos informations personnelles et sécurité</p>
      </div>

      {/* ── Identité ──────────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <BigAvatar user={currentUser} size={72} />
          <div className="flex-1 min-w-0">
            {editing ? (
              <form onSubmit={submitP(onSaveProfile)} className="space-y-3" noValidate>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prénom" error={errP.prenom?.message}>
                    <input {...regP('prenom')} className={`input-field ${errP.prenom ? 'input-error' : ''}`} autoFocus />
                  </Field>
                  <Field label="Nom" error={errP.nom?.message}>
                    <input {...regP('nom')} className={`input-field ${errP.nom ? 'input-error' : ''}`} />
                  </Field>
                </div>
                <Field label="Email" error={errP.email?.message}>
                  <input {...regP('email')} type="email" className={`input-field ${errP.email ? 'input-error' : ''}`} />
                </Field>
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={savingProfile} className="btn-primary">
                    {savingProfile
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Sauvegarde…</>
                      : <><Check size={14}/> Enregistrer</>}
                  </button>
                  <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
                    <X size={14}/> Annuler
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {currentUser.prenom} {currentUser.nom}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${roleConf.cls}`}>
                        <Shield size={11} /> {roleConf.label}
                      </span>
                      <span className="badge badge-green text-xs">Actif</span>
                    </div>
                  </div>
                  <button onClick={startEdit} className="btn-secondary flex-shrink-0">
                    <Edit2 size={14} /> Modifier
                  </button>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail size={13} className="text-gray-400 flex-shrink-0" />
                    {currentUser.email}
                  </div>
                  {currentUser.derniere_connexion && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock size={13} className="text-gray-400 flex-shrink-0" />
                      Dernière connexion : {new Date(currentUser.derniere_connexion).toLocaleString('fr-FR')}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats rapides ─────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Rôle',           value: roleConf.label },
          { label: 'Commandes',      value: nbCommandes !== null ? nbCommandes : '—' },
          { label: 'Membre depuis',  value: currentUser.created_at
              ? new Date(currentUser.created_at).toLocaleDateString('fr-FR', { month:'long', year:'numeric' })
              : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-sm font-semibold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Changer mot de passe ──────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <KeyRound size={15} className="text-sky-500" /> Changer le mot de passe
          </h3>
        </div>
        <div className="card-body">
          <form onSubmit={submitPwd(onChangePassword)} className="space-y-4 max-w-sm" noValidate>
            <Field label="Mot de passe actuel" error={errPwd.ancienPassword?.message}>
              <input {...regPwd('ancienPassword')} type="password"
                className={`input-field ${errPwd.ancienPassword ? 'input-error' : ''}`}
                autoComplete="current-password" />
            </Field>
            <Field label="Nouveau mot de passe" error={errPwd.nouveauPassword?.message}>
              <input {...regPwd('nouveauPassword')} type="password"
                className={`input-field ${errPwd.nouveauPassword ? 'input-error' : ''}`}
                autoComplete="new-password" placeholder="8 caractères minimum" />
            </Field>
            <Field label="Confirmer" error={errPwd.confirmPassword?.message}>
              <input {...regPwd('confirmPassword')} type="password"
                className={`input-field ${errPwd.confirmPassword ? 'input-error' : ''}`}
                autoComplete="new-password" />
            </Field>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              Vous serez déconnecté automatiquement après modification.
            </div>
            <button type="submit" disabled={savingPwd} className="btn-primary">
              {savingPwd
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Modification…</>
                : <><KeyRound size={14} /> Modifier le mot de passe</>}
            </button>
          </form>
        </div>
      </div>

      {/* ── Infos compte (lecture seule) ──────────────────────── */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-gray-900">Informations du compte</h3>
          <span className="text-xs text-gray-400">Géré par l'administrateur</span>
        </div>
        <div className="card-body">
          {[
            { label: 'Identifiant', value: currentUser.id, mono: true },
            { label: 'Rôle',        value: roleConf.label },
            { label: 'Statut',      value: currentUser.statut },
            { label: 'Créé le',     value: currentUser.created_at
                ? new Date(currentUser.created_at).toLocaleDateString('fr-FR', { dateStyle: 'long' })
                : '—' },
          ].map(({ label, value, mono }) => (
            <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-500">{label}</span>
              <span className={`text-sm font-medium max-w-[55%] text-right truncate ${mono ? 'text-gray-400 font-mono text-xs' : 'text-gray-900'}`}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
