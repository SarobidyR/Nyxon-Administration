import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Search, Edit2, Trash2, KeyRound,
  ShieldCheck, UserX, UserCheck, RefreshCw, Users,
} from 'lucide-react';
import api         from '../../api/axios';
import useUiStore  from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import toast        from 'react-hot-toast';

// ── Configs rôles / statuts ───────────────────────────────────
const ROLES = {
  superadmin: { label:'Super Admin', cls:'badge-purple' },
  admin:      { label:'Admin',       cls:'badge-sky'    },
  manager:    { label:'Manager',     cls:'badge-green'  },
  vendeur:    { label:'Vendeur',     cls:'badge-amber'  },
  lecteur:    { label:'Lecteur',     cls:'badge-gray'   },
};
const STATUTS = {
  actif:    { label:'Actif',    cls:'badge-green', icon: UserCheck },
  inactif:  { label:'Inactif',  cls:'badge-gray',  icon: UserX     },
  suspendu: { label:'Suspendu', cls:'badge-red',   icon: UserX     },
};

// ── Schémas validation ────────────────────────────────────────
const createSchema = z.object({
  nom:      z.string().min(1,'Requis'),
  prenom:   z.string().min(1,'Requis'),
  email:    z.string().email('Email invalide'),
  password: z.string().min(8,'8 caractères minimum'),
  role:     z.enum(['admin','manager','vendeur','lecteur']),
});
const editSchema = z.object({
  nom:    z.string().min(1,'Requis'),
  prenom: z.string().min(1,'Requis'),
  email:  z.string().email('Email invalide'),
  role:   z.enum(['admin','manager','vendeur','lecteur']),
  statut: z.enum(['actif','inactif','suspendu']),
});

// ── Field helper ──────────────────────────────────────────────
const Field = ({ label, error, children }) => (
  <div>
    <label className="label">{label}</label>
    {children}
    {error && <p className="error-msg">{error}</p>}
  </div>
);

// ── Modal Créer/Modifier ──────────────────────────────────────
function ModalUser({ user, onClose, onSuccess }) {
  const isEdit   = Boolean(user);
  const isSuperAdmin = useAuthStore((s) => s.hasRole('superadmin'));
  const schema   = isEdit ? editSchema : createSchema;

  const { register, handleSubmit, formState:{errors} } = useForm({
    resolver: zodResolver(schema),
    defaultValues: user ? {
      nom:    user.nom,
      prenom: user.prenom,
      email:  user.email,
      role:   user.role === 'superadmin' ? 'admin' : user.role,
      statut: user.statut,
    } : { role:'vendeur' },
  });
  const [saving, setSaving] = useState(false);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/admin/users/${user.id}`, data);
        toast.success('Utilisateur mis à jour');
      } else {
        await api.post('/admin/users', data);
        toast.success('Utilisateur créé');
      }
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
        <h3 className="text-base font-semibold text-gray-900 mb-5">
          {isEdit ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prénom *" error={errors.prenom?.message}>
              <input {...register('prenom')} className="input-field" autoComplete="off" />
            </Field>
            <Field label="Nom *" error={errors.nom?.message}>
              <input {...register('nom')} className="input-field" autoComplete="off" />
            </Field>
          </div>
          <Field label="Email *" error={errors.email?.message}>
            <input {...register('email')} type="email" className="input-field" autoComplete="off" />
          </Field>
          {!isEdit && (
            <Field label="Mot de passe *" error={errors.password?.message}>
              <input {...register('password')} type="password" className="input-field"
                placeholder="8 caractères minimum" autoComplete="new-password" />
            </Field>
          )}
          <div className={`grid gap-4 ${isEdit ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <Field label="Rôle *" error={errors.role?.message}>
              <select {...register('role')} className="input-field appearance-none">
                {Object.entries(ROLES)
                  .filter(([k]) => k !== 'superadmin' || isSuperAdmin)
                  .map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
              </select>
            </Field>
            {isEdit && (
              <Field label="Statut *" error={errors.statut?.message}>
                <select {...register('statut')} className="input-field appearance-none">
                  {Object.entries(STATUTS).map(([k,v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Sauvegarde…</>
                : isEdit ? 'Mettre à jour' : 'Créer'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal Reset Password ──────────────────────────────────────
function ModalPassword({ user, onClose, onSuccess }) {
  const [password, setPassword] = useState('');
  const [saving,   setSaving]   = useState(false);

  const submit = async () => {
    if (password.length < 8) return toast.error('8 caractères minimum');
    setSaving(true);
    try {
      await api.patch(`/admin/users/${user.id}/password`, { password });
      toast.success('Mot de passe réinitialisé — sessions révoquées');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Réinitialiser le mot de passe</h3>
        <p className="text-sm text-gray-500 mb-5">
          Pour <span className="font-medium">{user.prenom} {user.nom}</span> — toutes les sessions seront révoquées.
        </p>
        <div>
          <label className="label">Nouveau mot de passe</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="input-field" placeholder="8 caractères minimum" autoComplete="new-password" />
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose}  className="btn-secondary flex-1">Annuler</button>
          <button onClick={submit} disabled={saving} className="btn-danger flex-1">
            {saving ? 'Réinitialisation…' : 'Réinitialiser'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Suppression ─────────────────────────────────────────
function ModalDelete({ user, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <Trash2 size={18} className="text-red-600"/>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Supprimer cet utilisateur ?</h3>
            <p className="text-sm text-gray-500 mt-1">
              <span className="font-medium">{user.prenom} {user.nom}</span> ({user.email}) sera supprimé définitivement.
              Cette action est irréversible.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}   className="btn-secondary flex-1">Annuler</button>
          <button onClick={onConfirm} className="btn-danger flex-1">Supprimer</button>
        </div>
      </div>
    </div>
  );
}

// ── Avatar initiales ──────────────────────────────────────────
const Avatar = ({ user }) => {
  const initiales = `${user.prenom?.[0]||''}${user.nom?.[0]||''}`.toUpperCase();
  const colors = ['bg-sky-100 text-sky-700','bg-purple-100 text-purple-700',
    'bg-green-100 text-green-700','bg-amber-100 text-amber-700'];
  const idx = (user.nom?.charCodeAt(0)||0) % colors.length;
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${colors[idx]}`}>
      {initiales}
    </div>
  );
};

// ── Page principale ───────────────────────────────────────────
export default function UsersAdmin() {
  const setPageTitle  = useUiStore((s)  => s.setPageTitle);
  const currentUser   = useAuthStore((s) => s.user);
  const isSuperAdmin  = useAuthStore((s) => s.hasRole('superadmin'));

  const [users,    setUsers]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);  // 'create'|'edit'|'password'|'delete'
  const [selected, setSelected] = useState(null);
  const [search,   setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page,     setPage]     = useState(1);
  const LIMIT = 20;

  useEffect(() => { setPageTitle('Gestion des utilisateurs'); }, [setPageTitle]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/admin/users', {
        params: { search:search||undefined, role:roleFilter||undefined, page, limit:LIMIT },
      });
      setUsers(res.data);
      setTotal(res.total);
    } catch (err) {
      toast.error(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(1); }, [search, roleFilter]);

  const handleDelete = async () => {
    try {
      await api.delete(`/admin/users/${selected.id}`);
      toast.success('Utilisateur supprimé');
      setModal(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Erreur');
    }
  };

  const handleToggleStatut = async (user) => {
    const newStatut = user.statut === 'actif' ? 'suspendu' : 'actif';
    try {
      await api.patch(`/admin/users/${user.id}/statut`, { statut: newStatut });
      toast.success(`Compte ${newStatut}`);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Erreur');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      {/* En-tête */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Utilisateurs</h2>
          <p className="page-subtitle">{total} compte{total!==1?'s':''} enregistré{total!==1?'s':''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchUsers} className="btn-secondary px-3">
            <RefreshCw size={15} className={loading?'animate-spin':''} />
          </button>
          {isSuperAdmin && (
            <button onClick={() => setModal('create')} className="btn-primary">
              <Plus size={16} /> Nouvel utilisateur
            </button>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="card mb-4 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Nom, prénom, email…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="input-field w-full sm:w-40 appearance-none">
          <option value="">Tous les rôles</option>
          {Object.entries(ROLES).map(([k,v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Tableau */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto-layout">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Dernière connexion</th>
                <th>Créé le</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_,i) => (
                  <tr key={i}>{[...Array(6)].map((_,j)=>(
                    <td key={j}><div className="h-4 bg-gray-100 rounded animate-pulse"/></td>
                  ))}</tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <Users size={32} className="mx-auto mb-3 opacity-30"/>
                    <p>Aucun utilisateur trouvé</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const role   = ROLES[u.role]   || { label:u.role,   cls:'badge-gray'  };
                  const statut = STATUTS[u.statut]|| { label:u.statut, cls:'badge-gray'  };
                  const isMe   = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className={isMe ? 'bg-sky-50/50' : ''}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar user={u} />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 flex items-center gap-1.5">
                              {u.prenom} {u.nom}
                              {isMe && <span className="text-[10px] text-sky-600 bg-sky-100 px-1.5 py-0.5 rounded">Vous</span>}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${role.cls}`}>
                          {role.label}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${statut.cls}`}>
                          {statut.label}
                        </span>
                      </td>
                      <td className="text-gray-500 text-sm">
                        {u.derniere_connexion
                          ? new Date(u.derniere_connexion).toLocaleDateString('fr-FR',{dateStyle:'short'})
                          : <span className="text-gray-300">Jamais</span>}
                      </td>
                      <td className="text-gray-500 text-sm">
                        {new Date(u.created_at).toLocaleDateString('fr-FR',{dateStyle:'short'})}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          {/* Modifier */}
                          <button
                            onClick={() => { setSelected(u); setModal('edit'); }}
                            className="btn-ghost p-1.5" title="Modifier"
                            disabled={u.role==='superadmin' && !isSuperAdmin}
                          >
                            <Edit2 size={14} />
                          </button>
                          {/* Reset password */}
                          {isSuperAdmin && !isMe && (
                            <button
                              onClick={() => { setSelected(u); setModal('password'); }}
                              className="btn-ghost p-1.5 text-amber-500 hover:bg-amber-50"
                              title="Réinitialiser le mot de passe"
                            >
                              <KeyRound size={14} />
                            </button>
                          )}
                          {/* Suspendre/Activer */}
                          {!isMe && u.role !== 'superadmin' && (
                            <button
                              onClick={() => handleToggleStatut(u)}
                              className={`btn-ghost p-1.5 ${u.statut==='actif' ? 'text-red-400 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                              title={u.statut==='actif' ? 'Suspendre' : 'Réactiver'}
                            >
                              {u.statut==='actif' ? <UserX size={14}/> : <UserCheck size={14}/>}
                            </button>
                          )}
                          {/* Supprimer */}
                          {isSuperAdmin && !isMe && (
                            <button
                              onClick={() => { setSelected(u); setModal('delete'); }}
                              className="btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">{((page-1)*LIMIT)+1}–{Math.min(page*LIMIT,total)} sur {total}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p)=>Math.max(1,p-1))} disabled={page===1}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">← Précédent</button>
              <span className="text-sm text-gray-600">Page {page} / {totalPages}</span>
              <button onClick={() => setPage((p)=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">Suivant →</button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal==='create'   && <ModalUser     user={null}     onClose={()=>setModal(null)} onSuccess={()=>{setModal(null);fetchUsers();}} />}
      {modal==='edit'     && <ModalUser     user={selected}  onClose={()=>setModal(null)} onSuccess={()=>{setModal(null);fetchUsers();}} />}
      {modal==='password' && <ModalPassword user={selected}  onClose={()=>setModal(null)} onSuccess={()=>setModal(null)} />}
      {modal==='delete'   && <ModalDelete   user={selected}  onClose={()=>setModal(null)} onConfirm={handleDelete} />}
    </div>
  );
}
