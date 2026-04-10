import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Check, X, CreditCard,
  Package, User, Clock, ChevronRight,
} from 'lucide-react';
import api         from '../../api/axios';
import useUiStore  from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import toast        from 'react-hot-toast';

// ── Stepper workflow ──────────────────────────────────────────
const WORKFLOW_STEPS = ['brouillon','confirmee','en_preparation','expediee','livree'];

const STATUT_LABELS = {
  brouillon:      'Brouillon',
  confirmee:      'Confirmée',
  en_preparation: 'En préparation',
  expediee:       'Expédiée',
  livree:         'Livrée',
  annulee:        'Annulée',
  remboursee:     'Remboursée',
};

const NEXT_STATUT = {
  brouillon:      { to: 'confirmee',      label: 'Confirmer' },
  confirmee:      { to: 'en_preparation', label: 'Préparer' },
  en_preparation: { to: 'expediee',       label: 'Expédier' },
  expediee:       { to: 'livree',         label: 'Marquer livrée' },
};

const PAIEMENT_MODES = {
  especes:      'Espèces',
  carte:        'Carte bancaire',
  virement:     'Virement',
  cheque:       'Chèque',
  mobile_money: 'Mobile money',
  autre:        'Autre',
};

// ── Modal paiement ────────────────────────────────────────────
function ModalPaiement({ commande, onClose, onSuccess }) {
  const [montant, setMontant] = useState('');
  const [mode,    setMode]    = useState('especes');
  const [saving,  setSaving]  = useState(false);
  const reste = parseFloat(commande.total_ttc) - parseFloat(commande.montant_paye);

  const submit = async () => {
    if (!montant || parseFloat(montant) <= 0) return toast.error('Montant invalide');
    setSaving(true);
    try {
      await api.patch(`/commandes/${commande.id}/paiement`, { montant: parseFloat(montant), mode });
      toast.success('Paiement enregistré');
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Erreur paiement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Enregistrer un paiement</h3>
        <div className="space-y-4">
          <div>
            <label className="label">Reste à payer</label>
            <p className="text-xl font-bold text-gray-900">
              {reste.toLocaleString('fr-MG', { maximumFractionDigits: 0 })} Ar
            </p>
          </div>
          <div>
            <label className="label">Montant reçu (Ar)</label>
            <input type="number" min="0" value={montant} onChange={(e) => setMontant(e.target.value)}
              className="input-field" placeholder={`Max: ${reste.toLocaleString('fr-MG', { maximumFractionDigits: 0 })}`} />
          </div>
          <div>
            <label className="label">Mode de paiement</label>
            <select value={mode} onChange={(e) => setMode(e.target.value)} className="input-field appearance-none">
              {Object.entries(PAIEMENT_MODES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={submit} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Enregistrement…' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page detail ───────────────────────────────────────────────
export default function CommandeDetail() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const hasRole      = useAuthStore((s) => s.hasRole);

  const [commande,       setCommande]       = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [showPaiement,   setShowPaiement]   = useState(false);
  const [transitioning,  setTransitioning]  = useState(false);

  useEffect(() => { setPageTitle('Commande'); }, [setPageTitle]);

  const loadCommande = async () => {
    try {
      const { data: res } = await api.get(`/commandes/${id}`);
      setCommande(res.data);
    } catch {
      toast.error('Commande introuvable');
      navigate('/commandes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCommande(); }, [id]);

  const handleTransition = async () => {
    const next = NEXT_STATUT[commande.statut];
    if (!next) return;
    setTransitioning(true);
    try {
      await api.patch(`/commandes/${id}/statut`, { statut: next.to });
      toast.success(`Commande ${STATUT_LABELS[next.to].toLowerCase()}`);
      loadCommande();
    } catch (err) {
      toast.error(err.message || 'Erreur');
    } finally {
      setTransitioning(false);
    }
  };

  const handleAnnuler = async () => {
    if (!window.confirm('Annuler cette commande ?')) return;
    try {
      await api.delete(`/commandes/${id}`);
      toast.success('Commande annulée');
      navigate('/commandes');
    } catch (err) {
      toast.error(err.message || 'Erreur');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!commande) return null;

  const currentStep = WORKFLOW_STEPS.indexOf(commande.statut);
  const isTerminee  = ['livree','annulee','remboursee'].includes(commande.statut);
  const nextAction  = NEXT_STATUT[commande.statut];
  const canTransit  = hasRole('vendeur') && nextAction;
  const canAnnuler  = hasRole('manager') && !isTerminee;

  return (
    <div>
      {/* En-tête */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/commandes')} className="btn-ghost p-2">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="page-title font-mono">{commande.numero}</h2>
            <p className="page-subtitle">
              {new Date(commande.created_at).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canAnnuler && (
            <button onClick={handleAnnuler} className="btn-secondary text-red-600 hover:bg-red-50 border-red-200">
              <X size={15} /> Annuler
            </button>
          )}
          {canTransit && (
            <button onClick={handleTransition} disabled={transitioning} className="btn-primary">
              {transitioning
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Check size={15} /> {nextAction.label}</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Stepper */}
      {!['annulee','remboursee'].includes(commande.statut) && (
        <div className="card mb-6 p-6">
          <div className="flex items-center">
            {WORKFLOW_STEPS.map((step, i) => {
              const done    = i < currentStep;
              const current = i === currentStep;
              const future  = i > currentStep;
              return (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      done    ? 'bg-sky-500 text-white' :
                      current ? 'bg-sky-500 text-white ring-4 ring-sky-100' :
                                'bg-gray-100 text-gray-400'
                    }`}>
                      {done ? <Check size={14} /> : i + 1}
                    </div>
                    <span className={`mt-2 text-xs font-medium ${
                      current ? 'text-sky-600' : done ? 'text-gray-700' : 'text-gray-400'
                    }`}>
                      {STATUT_LABELS[step]}
                    </span>
                  </div>
                  {i < WORKFLOW_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-5 ${done ? 'bg-sky-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">

          {/* Lignes de commande */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Package size={15} className="text-sky-500" />
                Produits ({commande.lignes?.length || 0})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="table-auto-layout">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th className="text-right">Qté</th>
                    <th className="text-right">Prix HT</th>
                    <th className="text-right">Remise</th>
                    <th className="text-right">Total TTC</th>
                  </tr>
                </thead>
                <tbody>
                  {(commande.lignes || []).map((l) => (
                    <tr key={l.id}>
                      <td>
                        <p className="font-medium text-gray-900">{l.produit_nom}</p>
                        {l.produit_ref && <p className="text-xs text-gray-400">{l.produit_ref}</p>}
                      </td>
                      <td className="text-right font-medium">{l.quantite}</td>
                      <td className="text-right text-gray-600">
                        {Number(l.prix_unitaire_ht).toLocaleString('fr-MG', { maximumFractionDigits: 0 })} Ar
                      </td>
                      <td className="text-right text-gray-500">
                        {l.remise_pct > 0 ? `${l.remise_pct}%` : '—'}
                      </td>
                      <td className="text-right font-semibold text-gray-900">
                        {Number(l.total_ttc).toLocaleString('fr-MG', { maximumFractionDigits: 0 })} Ar
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Totaux */}
            <div className="p-4 border-t border-gray-100 space-y-2">
              {[
                { label: 'Sous-total HT',    value: commande.sous_total_ht },
                { label: `Remise (${commande.remise_pct}%)`, value: -commande.remise_montant, hidden: !parseFloat(commande.remise_montant) },
                { label: 'TVA',              value: commande.total_tva },
                { label: 'Frais de livraison', value: commande.frais_livraison, hidden: !parseFloat(commande.frais_livraison) },
              ].filter((r) => !r.hidden).map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm text-gray-600">
                  <span>{label}</span>
                  <span>{Number(value).toLocaleString('fr-MG', { maximumFractionDigits: 0 })} Ar</span>
                </div>
              ))}
              <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total TTC</span>
                <span>{Number(commande.total_ttc).toLocaleString('fr-MG', { maximumFractionDigits: 0 })} Ar</span>
              </div>
            </div>
          </div>

          {/* Historique */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Clock size={15} className="text-sky-500" /> Historique
              </h3>
            </div>
            <div className="card-body">
              {(commande.historique || []).length === 0 ? (
                <p className="text-sm text-gray-400">Aucun historique</p>
              ) : (
                <div className="space-y-3">
                  {[...(commande.historique || [])].reverse().map((h) => (
                    <div key={h.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-800">
                            {STATUT_LABELS[h.statut] || h.statut}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(h.created_at).toLocaleString('fr-FR')}
                          </span>
                        </div>
                        {h.commentaire && <p className="text-xs text-gray-500 mt-0.5">{h.commentaire}</p>}
                        {h.auteur_nom   && <p className="text-xs text-gray-400">par {h.auteur_nom}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">

          {/* Client */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <User size={15} className="text-sky-500" /> Client
              </h3>
            </div>
            <div className="card-body space-y-2">
              {commande.client_nom ? (
                <>
                  <p className="font-medium text-gray-900">{commande.client_nom}</p>
                  {commande.client_email && <p className="text-sm text-gray-500">{commande.client_email}</p>}
                  {commande.client_tel   && <p className="text-sm text-gray-500">{commande.client_tel}</p>}
                </>
              ) : (
                <p className="text-sm text-gray-400 italic">Client anonyme</p>
              )}
            </div>
          </div>

          {/* Paiement */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard size={15} className="text-sky-500" /> Paiement
              </h3>
              {hasRole('vendeur') && commande.paiement_statut !== 'paye' && !isTerminee && (
                <button onClick={() => setShowPaiement(true)} className="text-xs text-sky-600 hover:underline">
                  + Enregistrer
                </button>
              )}
            </div>
            <div className="card-body space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total</span>
                <span className="font-bold">{Number(commande.total_ttc).toLocaleString('fr-MG', { maximumFractionDigits: 0 })} Ar</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Payé</span>
                <span className="font-medium text-green-600">{Number(commande.montant_paye).toLocaleString('fr-MG', { maximumFractionDigits: 0 })} Ar</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-gray-500">Reste</span>
                <span className={`font-bold ${(commande.total_ttc - commande.montant_paye) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {Math.max(0, commande.total_ttc - commande.montant_paye).toLocaleString('fr-MG', { maximumFractionDigits: 0 })} Ar
                </span>
              </div>
              {commande.paiement_mode && (
                <p className="text-xs text-gray-400">
                  Mode : {PAIEMENT_MODES[commande.paiement_mode] || commande.paiement_mode}
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          {commande.notes && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-sm font-semibold text-gray-900">Notes</h3>
              </div>
              <div className="card-body">
                <p className="text-sm text-gray-600">{commande.notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showPaiement && (
        <ModalPaiement
          commande={commande}
          onClose={() => setShowPaiement(false)}
          onSuccess={() => { setShowPaiement(false); loadCommande(); }}
        />
      )}
    </div>
  );
}
