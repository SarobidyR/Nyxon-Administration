import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User, Mail, Phone, KeyRound, Save,
  Shield, Clock, Edit2, Check, X,
} from 'lucide-react';
import api          from '../../api/axios';
import useUiStore   from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import toast        from 'react-hot-toast';

// ── Schemas ───────────────────────────────────────────────────
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
  path:    ['confirmPassword'],
});

// ── Config rôles ──────────────────────────────────────────────
const ROLE_CONFIG = {
  superadmin: { label:'Super Admin', cls:'bg-purple-100 text-purple-700', icon:'👑' },
  admin:      { label:'Admin',       cls:'bg-sky-100    text-sky-700',    icon:'🛡️' },
  manager:    { label:'Manager',     cls:'bg-green-100  text-green-700',  icon:'📋' },
  vendeur:    { label:'Vendeur',     cls:'bg-amber-100  text-amber-700',  icon:'🛒' },
  lecteur:    { label:'Lecteur',     cls:'bg-gray-100   text-gray-600',   icon:'👁️' },
};

const Field = ({ label, error, children }) => (
  <div>
    <label className="label">{label}</label>
    {children}
    {error && <p className="error-msg">{error}</p>}
  </div>
);

// ── Avatar grand format ───────────────────────────────────────
function BigAvatar({ user, size = 80 }) {
  const initiales = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase();
  const colors = [
    'bg-sky-500',    'bg-purple-500', 'bg-green-500',
    'bg-amber-500',  'bg-pink-500',   'bg-teal-500',
  ];
  const idx = (user?.nom?.charCodeAt(0) || 0) % colors.length;

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${colors[idx]}`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initiales || <User size={size * 0.4} />}
    </div>
  );
}

export default function UserProfile() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const { user: currentUser, fetchMe, logout } = useAuthStore((s) => ({
    user:     s.user,
    fetchMe:  s.fetchMe,
    logout:   s.logout,
  }));

  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile,  setSavingProfile]  = useState(false);
  const [savingPwd,      setSavingPwd]      = useState(false);
  const [stats,          setStats]          = useState(null);

  useEffect(() => { setPageTitle('Mon profil'); }, [setPageTitle]);

  // Charger stats personnelles
  useEffect(() => {
    if (!currentUser) return;
    Promise.all([
      api.get('/commandes', { params:{ vendeur_id: currentUser.id, limit:1 } }).catch(() => null),
    ]).then(([cmdsRes]) => {
      setStats({
        nb_commandes: cmdsRes?.data?.total ?? 0,
      });
    });
  }, [currentUser]);

  // Formulaire profil
  const {
    register: regProfile,
    handleSubmit: submitProfile,
    reset: resetProfile,
    formState: { errors: errProfile },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nom:    currentUser?.nom    || '',
      prenom: currentUser?.prenom || '',
      email:  currentUser?.email  || '',
    },
  });

  // Formulaire mot de passe
  const {
    register: regPwd,
    handleSubmit: submitPwd,
    reset: resetPwd,
    formState: { errors: errPwd },
  } = useForm({ resolver: zodResolver(passwordSchema) });

  const startEdit = () => {
    resetProfile({
      nom:    currentUser?.nom    || '',
      prenom: currentUser?.prenom || '',
      email:  currentUser?.email  || '',
    });
    setEditingProfile(true);
  };

  const cancelEdit = () => setEditingProfile(false);

  const onSaveProfile = async (data) => {
    setSavingProfile(true);
    try {
      await api.put(`/admin/users/${currentUser.id}`, {
        ...data,
        role:   currentUser.role,
        statut: currentUser.statut,
      });
      await fetchMe();
      toast.success('Profil mis à jour');
      setEditingProfile(false);
    } catch (err) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSavingProfile(false);
    }
  };

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
      toast.error(err.message || 'Erreur');
    } finally {
      setSavingPwd(false);
    }
  };

  if (!currentUser) return null;

  const roleConf = ROLE_CONFIG[currentUser.role] || ROLE_CONFIG.lecteur;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="page-header">
        <div>
          <h2 className="page-title">Mon profil</h2>
          <p className="page-subtitle">Gérez vos informations personnelles</p>
        </div>
      </div>

      {/* ── Carte identité ──────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <BigAvatar user={currentUser} size={80} />

          <div className="flex-1 min-w-0">
            {editingProfile ? (
              <form onSubmit={submitProfile(onSaveProfile)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Prénom" error={errProfile.prenom?.message}>
                    <input {...regProfile('prenom')} className="input-field" autoFocus />
                  </Field>
                  <Field label="Nom" error={errProfile.nom?.message}>
                    <input {...regProfile('nom')} className="input-field" />
                  </Field>
                </div>
                <Field label="Email" error={errProfile.email?.message}>
                  <input {...regProfile('email')} type="email" className="input-field" />
                </Field>
                <div className="flex gap-2 pt-1">
                  <button type="submit" disabled={savingProfile} className="btn-primary">
                    {savingProfile ? 'Sauvegarde…' : <><Check size={14}/> Enregistrer</>}
                  </button>
                  <button type="button" onClick={cancelEdit} className="btn-secondary">
                    <X size={14}/> Annuler
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {currentUser.prenom} {currentUser.nom}
                    </h2>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${roleConf.cls}`}>
                        <Shield size={13}/> {roleConf.label}
                      </span>
                      <span className="badge badge-green">Actif</span>
                    </div>
                  </div>
                  <button onClick={startEdit} className="btn-secondary">
                    <Edit2 size={14}/> Modifier
                  </button>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail size={14} className="text-gray-400 flex-shrink-0"/>
                    <span>{currentUser.email}</span>
                  </div>
                  {currentUser.derniere_connexion && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock size={14} className="text-gray-400 flex-shrink-0"/>
                      <span>
                        Dernière connexion :{' '}
                        {new Date(currentUser.derniere_connexion).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats rapides ────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Rôle',           value: roleConf.label },
          { label: 'Commandes',      value: stats?.nb_commandes ?? '—' },
          { label: 'Membre depuis',  value: currentUser.created_at
              ? new Date(currentUser.created_at).toLocaleDateString('fr-FR', { month:'long', year:'numeric' })
              : '—'
          },
        ].map(({ label, value }) => (
          <div key={label} className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-base font-semibold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Sécurité — changer mot de passe ─────────────────── */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <KeyRound size={15} className="text-sky-500"/> Mot de passe
          </h3>
        </div>
        <div className="card-body">
          <form onSubmit={submitPwd(onChangePassword)} className="space-y-4 max-w-sm">
            <Field label="Mot de passe actuel" error={errPwd.ancienPassword?.message}>
              <input {...regPwd('ancienPassword')} type="password"
                className={`input-field ${errPwd.ancienPassword ? 'input-error' : ''}`}
                autoComplete="current-password"/>
            </Field>
            <Field label="Nouveau mot de passe" error={errPwd.nouveauPassword?.message}>
              <input {...regPwd('nouveauPassword')} type="password"
                className={`input-field ${errPwd.nouveauPassword ? 'input-error' : ''}`}
                autoComplete="new-password" placeholder="8 caractères minimum"/>
            </Field>
            <Field label="Confirmer le nouveau mot de passe" error={errPwd.confirmPassword?.message}>
              <input {...regPwd('confirmPassword')} type="password"
                className={`input-field ${errPwd.confirmPassword ? 'input-error' : ''}`}
                autoComplete="new-password"/>
            </Field>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
              Après modification, vous serez automatiquement déconnecté.
            </div>
            <button type="submit" disabled={savingPwd} className="btn-primary">
              {savingPwd
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Modification…</>
                : <><KeyRound size={14}/> Changer le mot de passe</>
              }
            </button>
          </form>
        </div>
      </div>

      {/* ── Informations du compte ───────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-gray-900">Informations du compte</h3>
        </div>
        <div className="card-body">
          {[
            { label: 'Identifiant',      value: currentUser.id },
            { label: 'Rôle assigné',     value: roleConf.label },
            { label: 'Statut',           value: currentUser.statut },
            { label: 'Date de création', value: currentUser.created_at
                ? new Date(currentUser.created_at).toLocaleDateString('fr-FR', { dateStyle:'long' })
                : '—'
            },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-500">{label}</span>
              <span className={`text-sm font-medium ${label==='Identifiant' ? 'text-gray-400 font-mono text-xs' : 'text-gray-900'}`}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
