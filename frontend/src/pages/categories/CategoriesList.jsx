import { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, FolderOpen, FolderTree, ChevronRight, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { categoriesApi } from '../../api/axios';
import useUiStore   from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import toast        from 'react-hot-toast';

const schema = z.object({
  nom:       z.string().min(1,'Nom requis'),
  parent_id: z.string().optional(),
  ordre:     z.coerce.number().int().min(0).default(0),
});

const Field = ({ label, error, children }) => (
  <div>
    <label className="label">{label}</label>
    {children}
    {error && <p className="error-msg">{error}</p>}
  </div>
);

// ── Modal formulaire ──────────────────────────────────────────
function ModalCategorie({ categorie, categories, onClose, onSuccess }) {
  const isEdit = Boolean(categorie);
  const { register, handleSubmit, formState:{errors} } = useForm({
    resolver: zodResolver(schema),
    defaultValues: categorie
      ? { nom:categorie.nom, parent_id:categorie.parent_id||'', ordre:categorie.ordre }
      : { ordre:0 },
  });
  const [saving, setSaving] = useState(false);

  const onSubmit = async (data) => {
    setSaving(true);
    const payload = { ...data, parent_id: data.parent_id || null };
    try {
      if (isEdit) {
        await categoriesApi.update(categorie.id, payload);
        toast.success('Catégorie mise à jour');
      } else {
        await categoriesApi.create(payload);
        toast.success('Catégorie créée');
      }
      onSuccess();
    } catch (err) { toast.error(err.message||'Erreur'); }
    finally { setSaving(false); }
  };

  // Exclure la catégorie elle-même et ses enfants des options parent
  const parentOptions = categories.filter((c) =>
    !isEdit || (c.id !== categorie.id && c.parent_id !== categorie.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-5">
          {isEdit ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Nom *" error={errors.nom?.message}>
            <input {...register('nom')} className={`input-field ${errors.nom?'input-error':''}`} placeholder="Ex: Vêtements" />
          </Field>
          <Field label="Catégorie parente">
            <select {...register('parent_id')} className="input-field appearance-none">
              <option value="">— Aucune (racine) —</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent_nom ? `${c.parent_nom} › ${c.nom}` : c.nom}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ordre d'affichage" error={errors.ordre?.message}>
            <input {...register('ordre')} type="number" min="0" className="input-field" placeholder="0"/>
          </Field>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Sauvegarde…' : isEdit ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Nœud arbre récursif ───────────────────────────────────────
function TreeNode({ node, depth, onEdit, onDelete, canEdit }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.enfants?.length > 0;

  return (
    <div>
      <div className={`flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 group transition-colors ${depth > 0 ? 'ml-' + (depth * 6) : ''}`}
        style={{ marginLeft: depth * 24 }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button onClick={() => setOpen(!open)} className={`flex-shrink-0 ${hasChildren ? 'text-gray-500 hover:text-gray-700' : 'invisible'}`}>
            <ChevronRight size={14} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
          <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${depth===0 ? 'bg-sky-100 text-sky-600' : 'bg-gray-100 text-gray-500'}`}>
            {hasChildren ? <FolderTree size={13}/> : <FolderOpen size={13}/>}
          </div>
          <span className={`text-sm truncate ${depth===0 ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
            {node.nom}
          </span>
          <code className="text-[10px] text-gray-400 bg-gray-100 px-1.5 rounded">{node.slug}</code>
          {node.nb_produits > 0 && (
            <span className="badge badge-sky text-[10px]">{node.nb_produits} produit{node.nb_produits>1?'s':''}</span>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(node)} className="btn-ghost p-1" title="Modifier"><Edit2 size={13}/></button>
            <button onClick={() => onDelete(node)} className="btn-ghost p-1 text-red-400 hover:bg-red-50" title="Supprimer"><Trash2 size={13}/></button>
          </div>
        )}
      </div>
      {hasChildren && open && node.enfants.map((child) => (
        <TreeNode key={child.id} node={child} depth={depth+1} onEdit={onEdit} onDelete={onDelete} canEdit={canEdit}/>
      ))}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────
export default function CategoriesList() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const canEdit      = useAuthStore((s) => s.hasRole('manager'));

  const [tree,       setTree]       = useState([]);
  const [flat,       setFlat]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState(null); // 'create'|'edit'
  const [selected,   setSelected]   = useState(null);

  useEffect(() => { setPageTitle('Catégories'); }, [setPageTitle]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [treeRes, flatRes] = await Promise.all([
        categoriesApi.getTree(),
        categoriesApi.getAll({ limit: 200 }),
      ]);
      setTree(treeRes.data.data);
      setFlat(flatRes.data.data);
    } catch (err) { toast.error(err.message||'Erreur'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (cat) => {
    if (!window.confirm(`Supprimer "${cat.nom}" ?`)) return;
    try {
      const { data: res } = await categoriesApi.remove(cat.id);
      toast.success(res.message);
      fetchAll();
    } catch (err) { toast.error(err.message||'Erreur'); }
  };

  const totalProduits = flat.reduce((acc, c) => acc + parseInt(c.nb_produits||0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Catégories</h2>
          <p className="page-subtitle">{flat.length} catégorie{flat.length!==1?'s':''} • {totalProduits} produits répartis</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} className="btn-secondary px-3">
            <RefreshCw size={15} className={loading?'animate-spin':''}/>
          </button>
          {canEdit && (
            <button onClick={() => { setSelected(null); setModal('create'); }} className="btn-primary">
              <Plus size={16}/> Nouvelle catégorie
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <FolderTree size={15} className="text-sky-500"/> Arborescence
          </h3>
          {canEdit && (
            <span className="text-xs text-gray-400">Survolez une ligne pour modifier/supprimer</span>
          )}
        </div>
        <div className="card-body py-2">
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_,i)=><div key={i} className="h-8 bg-gray-50 rounded animate-pulse"/>)}
            </div>
          ) : tree.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <FolderOpen size={32} className="mx-auto mb-3 opacity-30"/>
              <p>Aucune catégorie créée</p>
              {canEdit && (
                <button onClick={() => setModal('create')} className="mt-3 text-sm text-sky-600 hover:underline">
                  Créer la première catégorie →
                </button>
              )}
            </div>
          ) : (
            tree.map((node) => (
              <TreeNode key={node.id} node={node} depth={0} canEdit={canEdit}
                onEdit={(cat) => { setSelected(cat); setModal('edit'); }}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>

      {(modal === 'create' || modal === 'edit') && (
        <ModalCategorie
          categorie={modal === 'edit' ? selected : null}
          categories={flat}
          onClose={() => { setModal(null); setSelected(null); }}
          onSuccess={() => { setModal(null); setSelected(null); fetchAll(); }}
        />
      )}
    </div>
  );
}
