import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Tag, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import { marquesApi } from '../../api/axios';
import useUiStore   from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import toast        from 'react-hot-toast';

export default function MarquesList() {
  const navigate     = useNavigate();
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const canEdit      = useAuthStore((s) => s.hasRole('manager'));

  const [marques,  setMarques]  = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [page,     setPage]     = useState(1);
  const LIMIT = 30;

  useEffect(() => { setPageTitle('Marques'); }, [setPageTitle]);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await marquesApi.getAll({ search:search||undefined, page, limit:LIMIT });
      setMarques(res.data); setTotal(res.total);
    } catch (err) { toast.error(err.message||'Erreur'); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { setPage(1); }, [search]);

  const toggleActif = async (m) => {
    try {
      await marquesApi.toggleActif(m.id, !m.actif);
      toast.success(`Marque ${!m.actif ? 'activée' : 'désactivée'}`);
      fetch();
    } catch (err) { toast.error(err.message||'Erreur'); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Marques</h2>
          <p className="page-subtitle">{total} marque{total!==1?'s':''}</p>
        </div>
        {canEdit && (
          <button onClick={() => navigate('/marques/nouveau')} className="btn-primary">
            <Plus size={16}/> Nouvelle marque
          </button>
        )}
      </div>

      <div className="card mb-4 p-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input type="text" placeholder="Nom de la marque…" value={search}
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
              <th>Marque</th>
              <th>Description</th>
              <th>Site web</th>
              <th className="text-right">Produits</th>
              <th>Statut</th>
              {canEdit && <th className="text-right">Actions</th>}
            </tr></thead>
            <tbody>
              {loading ? [...Array(5)].map((_,i)=>(
                <tr key={i}>{[...Array(6)].map((_,j)=>(
                  <td key={j}><div className="h-4 bg-gray-100 rounded animate-pulse"/></td>
                ))}</tr>
              )) : marques.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                  <Tag size={32} className="mx-auto mb-3 opacity-30"/>
                  <p>Aucune marque</p>
                </td></tr>
              ) : marques.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Tag size={14} className="text-purple-600"/>
                      </div>
                      <span className="font-medium text-gray-900">{m.nom}</span>
                    </div>
                  </td>
                  <td className="text-gray-500 text-sm max-w-[200px] truncate">{m.description || '—'}</td>
                  <td>
                    {m.site_web
                      ? <a href={m.site_web} target="_blank" rel="noreferrer"
                          className="text-sky-600 text-sm hover:underline truncate block max-w-[150px]">
                          {m.site_web.replace(/^https?:\/\//, '')}
                        </a>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="text-right font-medium text-gray-900">{m.nb_produits || 0}</td>
                  <td>
                    <span className={`badge ${m.actif ? 'badge-green' : 'badge-gray'}`}>
                      {m.actif ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {canEdit && (
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/marques/${m.id}/edit`)}
                          className="btn-ghost p-1.5" title="Modifier"><Edit2 size={14}/></button>
                        <button onClick={() => toggleActif(m)}
                          className={`btn-ghost p-1.5 ${m.actif?'text-amber-500':'text-green-500'}`}
                          title={m.actif?'Désactiver':'Activer'}>
                          {m.actif ? <ToggleLeft size={16}/> : <ToggleRight size={16}/>}
                        </button>
                      </div>
                    </td>
                  )}
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
