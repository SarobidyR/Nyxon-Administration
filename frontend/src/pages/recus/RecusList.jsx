import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Search, Eye, Download, RefreshCw } from 'lucide-react';
import api        from '../../api/axios';
import useUiStore from '../../store/uiStore';
import toast      from 'react-hot-toast';

export default function RecusList() {
  const navigate     = useNavigate();
  const setPageTitle = useUiStore((s) => s.setPageTitle);

  const [recus,   setRecus]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [page,    setPage]    = useState(1);
  const LIMIT = 20;

  useEffect(() => { setPageTitle('Reçus'); }, [setPageTitle]);

  const fetchRecus = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/recus', { params:{ page, limit:LIMIT } });
      setRecus(res.data);
      setTotal(res.total);
    } catch (err) { toast.error(err.message||'Erreur'); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchRecus(); }, [fetchRecus]);

  const totalPages = Math.ceil(total / LIMIT);

  // Filtrage local sur le numéro/client
  const filtered = search
    ? recus.filter((r) =>
        r.numero?.toLowerCase().includes(search.toLowerCase()) ||
        r.commande_numero?.toLowerCase().includes(search.toLowerCase()) ||
        r.client_nom?.toLowerCase().includes(search.toLowerCase())
      )
    : recus;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Reçus</h2>
          <p className="page-subtitle">{total} reçu{total!==1?'s':''} générés</p>
        </div>
        <button onClick={fetchRecus} className="btn-secondary px-3">
          <RefreshCw size={15} className={loading?'animate-spin':''}/>
        </button>
      </div>

      <div className="card mb-4 p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input type="text" placeholder="Numéro reçu, commande, client…"
            value={search} onChange={(e)=>setSearch(e.target.value)}
            className="input-field pl-9"/>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto-layout">
            <thead><tr>
              <th>N° Reçu</th>
              <th>Commande</th>
              <th>Client</th>
              <th>Boutique</th>
              <th>Date</th>
              <th className="text-right">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? [...Array(5)].map((_,i)=>(
                <tr key={i}>{[...Array(6)].map((_,j)=>(
                  <td key={j}><div className="h-4 bg-gray-100 rounded animate-pulse"/></td>
                ))}</tr>
              )) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">
                  <Receipt size={32} className="mx-auto mb-3 opacity-30"/>
                  <p>Aucun reçu</p>
                  <p className="text-xs mt-1">Les reçus sont générés depuis les fiches commandes</p>
                </td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="font-mono text-sm font-medium text-gray-900">{r.numero}</span>
                  </td>
                  <td>
                    <button onClick={() => navigate(`/commandes/${r.commande_id}`)}
                      className="font-mono text-sm text-sky-600 hover:underline">
                      {r.commande_numero}
                    </button>
                  </td>
                  <td className="text-gray-600 text-sm">{r.client_nom || <span className="text-gray-300">Anonyme</span>}</td>
                  <td className="text-gray-500 text-sm">{r.boutique_nom || '—'}</td>
                  <td className="text-gray-500 text-sm">
                    {new Date(r.created_at).toLocaleDateString('fr-FR',{dateStyle:'short'})}
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => navigate(`/recus/${r.commande_id}`)}
                        className="btn-ghost p-1.5" title="Voir / Exporter JPEG">
                        <Eye size={15}/>
                      </button>
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
