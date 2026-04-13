import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Eye, Users, RefreshCw, Building2, User } from 'lucide-react';
import { clientsApi } from '../../api/axios';
import useUiStore    from '../../store/uiStore';
import useAuthStore  from '../../store/authStore';
import toast         from 'react-hot-toast';

export default function ClientsList() {
  const navigate     = useNavigate();
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const canEdit      = useAuthStore((s) => s.hasRole('vendeur'));

  const [clients,  setClients]  = useState([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [type,     setType]     = useState('');
  const [page,     setPage]     = useState(1);
  const LIMIT = 20;

  useEffect(() => { setPageTitle('Clients'); }, [setPageTitle]);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await clientsApi.getAll({
        search: search || undefined,
        type:   type   || undefined,
        page, limit: LIMIT,
      });
      setClients(res.data);
      setTotal(res.total);
    } catch (err) {
      toast.error(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [search, type, page]);

  useEffect(() => { fetchClients(); }, [fetchClients]);
  useEffect(() => { setPage(1); }, [search, type]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Clients</h2>
          <p className="page-subtitle">{total} client{total !== 1 ? 's' : ''}</p>
        </div>
        {canEdit && (
          <button onClick={() => navigate('/clients/nouveau')} className="btn-primary">
            <Plus size={16} /> Nouveau client
          </button>
        )}
      </div>

      <div className="card mb-4 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Nom, email, téléphone…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9" />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)}
          className="input-field w-full sm:w-44 appearance-none">
          <option value="">Tous les types</option>
          <option value="particulier">Particulier</option>
          <option value="professionnel">Professionnel</option>
        </select>
        <button onClick={fetchClients} className="btn-secondary px-3">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto-layout">
            <thead>
              <tr>
                <th>Client</th>
                <th>Type</th>
                <th>Contact</th>
                <th>Ville</th>
                <th className="text-right">Commandes</th>
                <th className="text-right">CA total</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>{[...Array(7)].map((_, j) => (
                    <td key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    <Users size={32} className="mx-auto mb-3 opacity-30" />
                    <p>Aucun client trouvé</p>
                  </td>
                </tr>
              ) : (
                clients.map((c) => {
                  const nom = c.type === 'professionnel'
                    ? c.raison_sociale
                    : `${c.prenom || ''} ${c.nom || ''}`.trim();
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            c.type === 'professionnel' ? 'bg-purple-100 text-purple-600' : 'bg-sky-100 text-sky-600'
                          }`}>
                            {c.type === 'professionnel'
                              ? <Building2 size={14} />
                              : <User size={14} />
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate max-w-[160px]">{nom || '—'}</p>
                            {c.email && <p className="text-xs text-gray-400 truncate">{c.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${c.type === 'professionnel' ? 'badge-purple' : 'badge-sky'}`}>
                          {c.type === 'professionnel' ? 'Pro' : 'Particulier'}
                        </span>
                      </td>
                      <td className="text-gray-500 text-sm">{c.telephone || '—'}</td>
                      <td className="text-gray-500 text-sm">{c.ville || '—'}</td>
                      <td className="text-right font-medium text-gray-900">{c.nb_commandes}</td>
                      <td className="text-right font-medium text-gray-900">
                        {Number(c.ca_total || 0).toLocaleString('fr-MG', { maximumFractionDigits: 0 })} Ar
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => navigate(`/clients/${c.id}`)} className="btn-ghost p-1.5" title="Voir">
                            <Eye size={15} />
                          </button>
                          {canEdit && (
                            <button onClick={() => navigate(`/clients/${c.id}/edit`)} className="btn-ghost p-1.5" title="Modifier">
                              <Edit2 size={15} />
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
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">{((page-1)*LIMIT)+1}–{Math.min(page*LIMIT,total)} sur {total}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1,p-1))} disabled={page===1}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">← Précédent</button>
              <span className="text-sm text-gray-600">Page {page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">Suivant →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
