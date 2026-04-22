import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, FolderOpen, FolderTree,
  ChevronRight, RefreshCw, FolderRoot, Lock,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { categoriesApi } from '../../api/axios';
import useUiStore   from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import toast        from 'react-hot-toast';

const schema = z.object({
  nom:         z.string().min(1, 'Nom requis'),
  description: z.string().optional(),
  // parent_id peut être vide (""), null, ou un UUID — tout est valide
  parent_id:   z.string().optional().transform((v) => (!v || v === '' ? undefined : v)),
  ordre:       z.coerce.number().int().min(0).default(0),
});

const Field = ({ label, error, hint, children }) => (
  <div>
    <label className="label">{label}</label>
    {children}
    {hint  && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    {error && <p className="error-msg">{error}</p>}
  </div>
);

// ── Modal ─────────────────────────────────────────────────────
function ModalCategorie({ categorie, categories, forceRacine, onClose, onSuccess }) {
  const isEdit = Boolean(categorie);

  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? { nom: categorie.nom, parent_id: categorie.parent_id || '', ordre: categorie.ordre, description: categorie.description || '' }
      : { ordre: 0, parent_id: forceRacine ? '' : '' },
  });

  const [saving, setSaving] = useState(false);
  const parentIdValue = watch('parent_id');

  // Options valides pour parent (exclure soi-même et ses enfants)
  const parentOptions = categories.filter((c) =>
    !isEdit || (c.id !== categorie.id && c.parent_id !== categorie.id)
  );

  const onSubmit = async (data) => {
    setSaving(true);
    const payload = {
      nom:         data.nom,
      description: data.description || null,
      ordre:       data.ordre ?? 0,
      // parent_id : undefined/vide => null (catégorie racine)
      parent_id:   forceRacine ? null : (data.parent_id || null),
    };
    try {
      if (isEdit) {
        await categoriesApi.update(categorie.id, payload);
        toast.success('Catégorie mise à jour');
      } else {
        await categoriesApi.create(payload);
        toast.success('Catégorie créée');
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        {/* Titre */}
        <div className="flex items-center gap-2 mb-5">
          {forceRacine
            ? <FolderRoot size={18} className="text-sky-500" />
            : <FolderTree size={18} className="text-sky-500" />
          }
          <h3 className="text-base font-semibold text-gray-900">
            {isEdit
              ? 'Modifier la catégorie'
              : forceRacine
                ? 'Nouvelle catégorie racine'
                : 'Nouvelle catégorie'
            }
          </h3>
        </div>

        {/* Bandeau info racine */}
        {forceRacine && !isEdit && (
          <div className="bg-sky-50 border border-sky-200 rounded-lg px-3 py-2.5 mb-4 text-xs text-sky-700">
            Cette catégorie sera un niveau de premier niveau — sans parent.
            Elle apparaîtra à la racine de l'arborescence.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label="Nom *" error={errors.nom?.message}>
            <input {...register('nom')}
              className={`input-field ${errors.nom ? 'input-error' : ''}`}
              placeholder="Ex: Vêtements" autoFocus />
          </Field>

          <Field label="Description" error={errors.description?.message}>
            <input {...register('description')} className="input-field"
              placeholder="Description courte (optionnel)" />
          </Field>

          {/* Sélecteur parent — masqué si forceRacine */}
          {!forceRacine && (
            <Field label="Catégorie parente" hint="Laissez vide pour créer une catégorie racine">
              <select {...register('parent_id')} className="input-field appearance-none">
                <option value="">— Aucune (catégorie racine) —</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_nom ? `${c.parent_nom} › ${c.nom}` : c.nom}
                  </option>
                ))}
              </select>
              {/* Info dynamique */}
              {!parentIdValue && (
                <p className="mt-1 text-xs text-sky-600 font-medium">
                  → Sera créée comme catégorie de premier niveau
                </p>
              )}
            </Field>
          )}

          <Field label="Ordre d'affichage" error={errors.ordre?.message}
            hint="Les catégories sont triées par ordre croissant">
            <input {...register('ordre')} type="number" min="0"
              className="input-field" placeholder="0" />
          </Field>

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

// ── Nœud arbre ────────────────────────────────────────────────
function TreeNode({ node, depth, onEdit, onDelete, canEdit }) {
  const [open, setOpen]   = useState(true);
  const hasChildren       = node.enfants?.length > 0;
  const indentPx          = depth * 24;

  return (
    <div>
      <div
        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 group transition-colors"
        style={{ marginLeft: indentPx }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Toggle */}
          <button
            onClick={() => setOpen((v) => !v)}
            className={`w-5 h-5 flex items-center justify-center flex-shrink-0 ${
              hasChildren ? 'text-gray-400 hover:text-gray-700' : 'invisible'
            }`}
          >
            <ChevronRight size={13} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>

          {/* Icône */}
          <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
            depth === 0 ? 'bg-sky-100 text-sky-600' : 'bg-gray-100 text-gray-500'
          }`}>
            {hasChildren ? <FolderTree size={13} /> : <FolderOpen size={13} />}
          </div>

          {/* Nom */}
          <span className={`text-sm truncate ${depth === 0 ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
            {node.nom}
          </span>

          {/* Slug */}
          <code className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded hidden sm:inline">
            {node.slug}
          </code>

          {/* Compteur produits */}
          {parseInt(node.nb_produits) > 0 && (
            <span className="badge badge-sky text-[10px] flex-shrink-0">
              {node.nb_produits} produit{node.nb_produits > 1 ? 's' : ''}
            </span>
          )}

          {/* Badge racine */}
          {depth === 0 && (
            <span className="badge badge-purple text-[10px] flex-shrink-0">Racine</span>
          )}
        </div>

        {/* Actions — visibles au survol */}
        {canEdit && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={() => onEdit(node)} className="btn-ghost p-1.5" title="Modifier">
              <Edit2 size={13} />
            </button>
            <button onClick={() => onDelete(node)}
              className="btn-ghost p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
              title="Supprimer">
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Enfants */}
      {hasChildren && open && node.enfants.map((child) => (
        <TreeNode key={child.id} node={child} depth={depth + 1}
          onEdit={onEdit} onDelete={onDelete} canEdit={canEdit} />
      ))}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────
export default function CategoriesList() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  // ✅ Création/modification réservée aux admins (et superadmins)
  const canEdit      = useAuthStore((s) => s.hasRole('admin'));

  const [tree,     setTree]     = useState([]);
  const [flat,     setFlat]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);      // 'create' | 'edit' | 'racine'
  const [selected, setSelected] = useState(null);

  useEffect(() => { setPageTitle('Catégories'); }, [setPageTitle]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [treeRes, flatRes] = await Promise.all([
        categoriesApi.getTree(),
        categoriesApi.getAll({ limit: 200 }),
      ]);
      setTree(treeRes.data.data   || []);
      setFlat(flatRes.data.data   || []);
    } catch (err) {
      toast.error(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (cat) => {
    if (!window.confirm(`Supprimer "${cat.nom}" ?`)) return;
    try {
      const { data: res } = await categoriesApi.remove(cat.id);
      toast.success(res.message || 'Catégorie supprimée');
      fetchAll();
    } catch (err) {
      toast.error(err.message || 'Erreur');
    }
  };

  const nbRacines        = tree.length;
  const nbTotal          = flat.length;
  const nbProduitsTotal  = flat.reduce((acc, c) => acc + parseInt(c.nb_produits || 0), 0);

  return (
    <div>
      {/* En-tête */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Catégories</h2>
          <p className="page-subtitle">
            {nbTotal} catégorie{nbTotal !== 1 ? 's' : ''} · {nbRacines} racine{nbRacines !== 1 ? 's' : ''} · {nbProduitsTotal} produits répartis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} className="btn-secondary px-3" title="Rafraîchir">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          {canEdit ? (
            <>
              {/* Nouvelle catégorie racine */}
              <button
                onClick={() => { setSelected(null); setModal('racine'); }}
                className="btn-secondary"
                title="Créer une catégorie de premier niveau"
              >
                <FolderRoot size={15} /> Nouvelle racine
              </button>
              {/* Nouvelle catégorie (avec choix parent) */}
              <button
                onClick={() => { setSelected(null); setModal('create'); }}
                className="btn-primary"
              >
                <Plus size={16} /> Nouvelle catégorie
              </button>
            </>
          ) : (
            /* Lecteur/manager : indication de restriction */
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-xs text-gray-500">
              <Lock size={12} /> Création réservée aux admins
            </div>
          )}
        </div>
      </div>

      {/* Arborescence */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <FolderTree size={15} className="text-sky-500" /> Arborescence
          </h3>
          {canEdit && (
            <span className="text-xs text-gray-400">Survolez une ligne pour modifier / supprimer</span>
          )}
        </div>
        <div className="card-body py-2">
          {loading ? (
            <div className="space-y-2 py-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-50 rounded animate-pulse" />
              ))}
            </div>
          ) : tree.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FolderOpen size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-gray-600">Aucune catégorie</p>
              {canEdit ? (
                <button onClick={() => setModal('racine')}
                  className="mt-3 text-sm text-sky-600 hover:underline">
                  Créer la première catégorie →
                </button>
              ) : (
                <p className="text-sm text-gray-400 mt-1">
                  Demandez à un administrateur de créer les catégories
                </p>
              )}
            </div>
          ) : (
            <div className="py-1">
              {tree.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  canEdit={canEdit}
                  onEdit={(cat)    => { setSelected(cat); setModal('edit'); }}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal === 'racine' && (
        <ModalCategorie
          categorie={null}
          categories={flat}
          forceRacine={true}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); fetchAll(); }}
        />
      )}
      {modal === 'create' && (
        <ModalCategorie
          categorie={null}
          categories={flat}
          forceRacine={false}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); fetchAll(); }}
        />
      )}
      {modal === 'edit' && selected && (
        <ModalCategorie
          categorie={selected}
          categories={flat}
          forceRacine={false}
          onClose={() => { setModal(null); setSelected(null); }}
          onSuccess={() => { setModal(null); setSelected(null); fetchAll(); }}
        />
      )}
    </div>
  );
}
