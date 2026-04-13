import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Truck, RefreshCw, Star } from 'lucide-react';
import { fournisseursApi } from '../../api/axios';
import useUiStore  from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import toast        from 'react-hot-toast';

const StarRating = ({ note }) => {
  const n = Math.round(parseFloat(note) || 0);
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <Star key={i} size={12}
          className={i <= n ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />
      ))}
    </div>
  );
};

export default function FournisseursList() {
  const navigate     = useNavigate();
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const canEdit      = useAuthStore((s) => s.hasRole('manager'));

  const [fournisseurs, setFournisseurs] = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(1);
  const LIMIT = 20;

  useEffect(() => { setPageTitle('Fournisseurs'); }, [setPageTitle]);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await fournisseursApi.getAll({ search: search||undefined, page, limit:LIMIT });
      setFournisseurs(res.data); setTotal(res.total);
    } catch (err) { toast.error(err.message || 'Erreur'); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { setPage(1); }, [search]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Fournisseurs</h2>
          <p className="page-subtitle">{total} fournisseur{total!==1?'s':''}</p>
        </div>
        {canEdit && (
          <button onClick={() => navigate('/fournisseurs/nouveau')} className="btn-primary">
            <Plus size={16}/> Nouveau fournisseur
          </button>
        )}
      </div>

      <div className="card mb-4 p-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input type="text" placeholder="Raison sociale, email…" value={search}
            onChange={(e)=>setSearch(e.target.value)} className="input-field pl-9"/>
        </div>
        <button onClick={fetch} className="btn-secondary px-3">
          <RefreshCw size={15} className={loading?'animate-spin':''}/>
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto-layout">
            <thead><tr>
              <th>Fournisseur</th>
              <th>Contact</th>
              <th>Pays</th>
              <th>Délai livraison</th>
              <th>Conditions</th>
              <th>Note</th>
              <th className="text-right">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? [...Array(5)].map((_,i)=>(
                <tr key={i}>{[...Array(7)].map((_,j)=>(
                  <td key={j}><div className="h-4 bg-gray-100 rounded animate-pulse"/></td>
                ))}</tr>
              )) : fournisseurs.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">
                  <Truck size={32} className="mx-auto mb-3 opacity-30"/>
                  <p>Aucun fournisseur</p>
                </td></tr>
              ) : fournisseurs.map((f) => (
                <tr key={f.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Truck size={15} className="text-amber-600"/>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{f.raison_sociale}</p>
                        {!f.actif && <span className="badge badge-gray text-[10px]">Inactif</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <p className="text-sm text-gray-700">{f.contact_nom || '—'}</p>
                    {f.contact_email && <p className="text-xs text-gray-400">{f.contact_email}</p>}
                  </td>
                  <td className="text-gray-500 text-sm">{f.pays || '—'}</td>
                  <td className="text-gray-500 text-sm">
                    {f.delai_livraison ? `${f.delai_livraison}j` : '—'}
                  </td>
                  <td className="text-gray-500 text-sm">{f.conditions_paiement || '—'}</td>
                  <td>{f.note ? <StarRating note={f.note}/> : <span className="text-gray-300 text-xs">—</span>}</td>
                  <td>
                    <div className="flex justify-end">
                      {canEdit && (
                        <button onClick={() => navigate(`/fournisseurs/${f.id}/edit`)}
                          className="btn-ghost p-1.5" title="Modifier">
                          <Edit2 size={15}/>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">{((page-1)*LIMIT)+1}–{Math.min(page*LIMIT,total)} sur {total}</p>
            <div className="flex items-center gap-2">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">← Précédent</button>
              <span className="text-sm text-gray-600">Page {page}/{totalPages}</span>
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">Suivant →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
