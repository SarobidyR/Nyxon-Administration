import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, User, Building2, Mail, Phone, MapPin, ShoppingCart } from 'lucide-react';
import { clientsApi } from '../../api/axios';
import api        from '../../api/axios';
import useUiStore  from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import toast        from 'react-hot-toast';

const InfoRow = ({ label, value }) => (
  <div className="flex items-start justify-between py-2.5 border-b border-gray-100 last:border-0">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-sm font-medium text-gray-900 text-right ml-4">{value || '—'}</span>
  </div>
);

export default function ClientDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const canEdit      = useAuthStore((s) => s.hasRole('vendeur'));

  const [client,    setClient]    = useState(null);
  const [commandes, setCommandes] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => { setPageTitle('Fiche client'); }, [setPageTitle]);

  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, cmdRes] = await Promise.all([
          clientsApi.getOne(id),
          api.get('/commandes', { params: { client_id: id, limit: 10 } }),
        ]);
        setClient(cRes.data.data);
        setCommandes(cmdRes.data.data || []);
      } catch {
        toast.error('Client introuvable');
        navigate('/clients');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!client) return null;

  const nom = client.type === 'professionnel'
    ? client.raison_sociale
    : `${client.prenom || ''} ${client.nom || ''}`.trim();
  const initiales = nom.split(' ').slice(0,2).map((w)=>w[0]||'').join('').toUpperCase();

  const STATUT_CLS = {
    brouillon:'badge-gray', confirmee:'badge-sky', en_preparation:'badge-amber',
    expediee:'badge-purple', livree:'badge-green', annulee:'badge-red',
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/clients')} className="btn-ghost p-2"><ArrowLeft size={18}/></button>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-base flex-shrink-0 ${
              client.type === 'professionnel' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'
            }`}>
              {initiales || (client.type==='professionnel' ? <Building2 size={20}/> : <User size={20}/>)}
            </div>
            <div>
              <h2 className="page-title">{nom}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`badge ${client.type==='professionnel'?'badge-purple':'badge-sky'}`}>
                  {client.type === 'professionnel' ? 'Professionnel' : 'Particulier'}
                </span>
                {!client.actif && <span className="badge badge-red">Archivé</span>}
              </div>
            </div>
          </div>
        </div>
        {canEdit && (
          <button onClick={() => navigate(`/clients/${id}/edit`)} className="btn-primary">
            <Edit2 size={16}/> Modifier
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* KPI */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label:'Commandes',   value: client.nb_commandes },
              { label:'CA total',    value:`${Number(client.ca_total||0).toLocaleString('fr-MG',{maximumFractionDigits:0})} Ar` },
              { label:'Panier moy.', value: client.nb_commandes > 0
                  ? `${Math.round(client.ca_total / client.nb_commandes).toLocaleString('fr-MG')} Ar`
                  : '—'
              },
            ].map(({ label, value }) => (
              <div key={label} className="card p-4">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          {/* Historique commandes */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <ShoppingCart size={15} className="text-sky-500"/> Dernières commandes
              </h3>
              <button onClick={() => navigate(`/commandes?client_id=${id}`)} className="text-xs text-sky-600 hover:underline">
                Voir tout →
              </button>
            </div>
            <div className="card-body p-0">
              {commandes.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Aucune commande</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Numéro</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Statut</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Total</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Date</th>
                  </tr></thead>
                  <tbody>
                    {commandes.map((c) => (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/commandes/${c.id}`)}>
                        <td className="px-4 py-2.5 font-mono text-sm font-medium">{c.numero}</td>
                        <td className="px-4 py-2.5">
                          <span className={`badge ${STATUT_CLS[c.statut]||'badge-gray'}`}>{c.statut}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold">
                          {Number(c.total_ttc).toLocaleString('fr-MG',{maximumFractionDigits:0})} Ar
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-500">
                          {new Date(c.created_at).toLocaleDateString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          <div className="card">
            <div className="card-header"><h3 className="text-sm font-semibold text-gray-900">Contact</h3></div>
            <div className="card-body space-y-3">
              {client.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700 truncate">{client.email}</span>
                </div>
              )}
              {client.telephone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="text-gray-700">{client.telephone}</span>
                </div>
              )}
              {(client.adresse || client.ville) && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    {[client.adresse, client.ville, client.code_postal, client.pays].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {client.type === 'professionnel' && (client.num_tva || client.siret) && (
            <div className="card">
              <div className="card-header"><h3 className="text-sm font-semibold text-gray-900">Informations légales</h3></div>
              <div className="card-body">
                <InfoRow label="N° TVA"           value={client.num_tva} />
                <InfoRow label="SIRET / Registre" value={client.siret} />
              </div>
            </div>
          )}

          {client.notes && (
            <div className="card">
              <div className="card-header"><h3 className="text-sm font-semibold text-gray-900">Notes</h3></div>
              <div className="card-body"><p className="text-sm text-gray-600">{client.notes}</p></div>
            </div>
          )}

          <div className="card">
            <div className="card-body">
              <InfoRow label="Créé le" value={new Date(client.created_at).toLocaleDateString('fr-FR',{dateStyle:'long'})} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
