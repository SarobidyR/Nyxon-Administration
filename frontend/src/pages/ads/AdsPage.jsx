import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Megaphone, TrendingUp, DollarSign,
  MousePointerClick, Eye, Edit2, Trash2,
  ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';
import api        from '../../api/axios';
import useUiStore from '../../store/uiStore';
import toast      from 'react-hot-toast';

// ── Configs ───────────────────────────────────────────────────
const PLATEFORMES = { facebook:'Facebook', instagram:'Instagram', facebook_instagram:'FB + IG' };
const OBJECTIFS   = { notoriete:'Notoriété', trafic:'Trafic', conversions:'Conversions', ventes:'Ventes', engagement:'Engagement' };
const STATUTS_CLS = { planifiee:'badge-gray', active:'badge-green', pausee:'badge-amber', terminee:'badge-gray', annulee:'badge-red' };

const PLT_COLORS  = { facebook:'#1877F2', instagram:'#E1306C', facebook_instagram:'#833AB4' };

// ── Schéma formulaire ─────────────────────────────────────────
const schema = z.object({
  nom:              z.string().min(1,'Nom requis'),
  plateforme:       z.enum(['facebook','instagram','facebook_instagram']),
  objectif:         z.enum(['notoriete','trafic','conversions','ventes','engagement']),
  budget_total:     z.coerce.number().min(0,'Budget invalide'),
  budget_journalier:z.coerce.number().min(0).optional().nullable(),
  date_debut:       z.string().min(1,'Date requise'),
  date_fin:         z.string().optional(),
  notes:            z.string().optional(),
});

// ── Modal campagne ────────────────────────────────────────────
function ModalCampagne({ campagne, onClose, onSuccess }) {
  const isEdit = Boolean(campagne);
  const { register, handleSubmit, formState:{ errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: campagne ? {
      ...campagne,
      date_debut: campagne.date_debut?.slice(0,10),
      date_fin:   campagne.date_fin?.slice(0,10) || '',
    } : { plateforme:'facebook', objectif:'ventes' },
  });
  const [saving, setSaving] = useState(false);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/ads/campagnes/${campagne.id}`, data);
        toast.success('Campagne mise à jour');
      } else {
        await api.post('/ads/campagnes', data);
        toast.success('Campagne créée');
      }
      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, error, children }) => (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="error-msg">{error}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-5">
          {isEdit ? 'Modifier la campagne' : 'Nouvelle campagne'}
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Nom *" error={errors.nom?.message}>
            <input {...register('nom')} className="input-field" placeholder="Ex: Promo Été 2024" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Plateforme *" error={errors.plateforme?.message}>
              <select {...register('plateforme')} className="input-field appearance-none">
                {Object.entries(PLATEFORMES).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <Field label="Objectif *" error={errors.objectif?.message}>
              <select {...register('objectif')} className="input-field appearance-none">
                {Object.entries(OBJECTIFS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Budget total (Ar) *" error={errors.budget_total?.message}>
              <input {...register('budget_total')} type="number" min="0" className="input-field" />
            </Field>
            <Field label="Budget journalier (Ar)" error={errors.budget_journalier?.message}>
              <input {...register('budget_journalier')} type="number" min="0" className="input-field" placeholder="Optionnel" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date début *" error={errors.date_debut?.message}>
              <input {...register('date_debut')} type="date" className="input-field" />
            </Field>
            <Field label="Date fin" error={errors.date_fin?.message}>
              <input {...register('date_fin')} type="date" className="input-field" />
            </Field>
          </div>
          <Field label="Notes">
            <textarea {...register('notes')} rows={2} className="input-field resize-none" />
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

// ── Modal dépense quotidienne ─────────────────────────────────
function ModalDepense({ campagne, onClose, onSuccess }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0,10),
    depense:'', impressions:'', clics:'', conversions:'', revenus:'',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.depense) return toast.error('Dépense requise');
    setSaving(true);
    try {
      await api.post(`/ads/campagnes/${campagne.id}/depenses`, {
        date:        form.date,
        depense:     parseFloat(form.depense),
        impressions: parseInt(form.impressions) || 0,
        clics:       parseInt(form.clics)       || 0,
        conversions: parseInt(form.conversions) || 0,
        revenus:     parseFloat(form.revenus)   || 0,
      });
      toast.success('Dépense enregistrée');
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
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Dépense — {campagne.nom}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="label">Date</label>
            <input type="date" value={form.date} onChange={(e)=>setForm({...form,date:e.target.value})} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Dépense (Ar) *</label>
              <input type="number" min="0" value={form.depense} onChange={(e)=>setForm({...form,depense:e.target.value})} className="input-field" />
            </div>
            <div>
              <label className="label">Revenus générés (Ar)</label>
              <input type="number" min="0" value={form.revenus} onChange={(e)=>setForm({...form,revenus:e.target.value})} className="input-field" placeholder="0" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label text-xs">Impressions</label>
              <input type="number" min="0" value={form.impressions} onChange={(e)=>setForm({...form,impressions:e.target.value})} className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="label text-xs">Clics</label>
              <input type="number" min="0" value={form.clics} onChange={(e)=>setForm({...form,clics:e.target.value})} className="input-field" placeholder="0" />
            </div>
            <div>
              <label className="label text-xs">Conversions</label>
              <input type="number" min="0" value={form.conversions} onChange={(e)=>setForm({...form,conversions:e.target.value})} className="input-field" placeholder="0" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={submit} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Enregistrement…' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────
export default function AdsPage() {
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const [resume,    setResume]    = useState(null);
  const [campagnes, setCampagnes] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null); // 'create'|'edit'|'depense'
  const [selected,  setSelected]  = useState(null);
  const [expanded,  setExpanded]  = useState(null);

  useEffect(() => { setPageTitle('Ads Budget'); }, [setPageTitle]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [res, camp] = await Promise.all([
        api.get('/ads/campagnes/resume'),
        api.get('/ads/campagnes', { params: { limit: 50 } }),
      ]);
      setResume(res.data.data);
      setCampagnes(camp.data.data);
    } catch (err) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const g = resume?.global || {};
  const fmtAr = (v) => v ? `${Number(v).toLocaleString('fr-MG',{maximumFractionDigits:0})} Ar` : '0 Ar';

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Ads Budget</h2>
          <p className="page-subtitle">Gestion des campagnes Facebook & Instagram</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} className="btn-secondary px-3">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setModal('create')} className="btn-primary">
            <Plus size={16} /> Nouvelle campagne
          </button>
        </div>
      </div>

      {/* KPI Cards globaux */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label:'Budget total',     value:fmtAr(g.budget_total),          icon:DollarSign,      color:'border-l-sky-500'    },
          { label:'Dépense totale',   value:fmtAr(g.depense_totale),         icon:TrendingUp,      color:'border-l-amber-500'  },
          { label:'Revenus générés',  value:fmtAr(g.revenus_totaux),         icon:TrendingUp,      color:'border-l-green-500'  },
          { label:'ROAS global',      value:`×${Number(g.roas_global||0).toFixed(2)}`, icon:MousePointerClick, color:'border-l-purple-500' },
        ].map(({ label, value, icon:Icon, color }) => (
          <div key={label} className={`card p-4 border-l-4 ${color}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            {loading ? <div className="h-6 w-24 bg-gray-100 rounded animate-pulse" /> : (
              <p className="text-xl font-bold text-gray-900">{value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Par plateforme */}
      {resume?.parPlateforme?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {resume.parPlateforme.map((p) => (
            <div key={p.plateforme} className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ background: PLT_COLORS[p.plateforme] || '#888' }} />
                <span className="text-sm font-semibold text-gray-800">{PLATEFORMES[p.plateforme] || p.plateforme}</span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Dépense</span><span className="font-medium">{fmtAr(p.depense)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Revenus</span><span className="font-medium text-green-600">{fmtAr(p.revenus)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">ROAS</span><span className={`font-bold ${parseFloat(p.roas)>=1?'text-green-600':'text-red-500'}`}>×{Number(p.roas).toFixed(2)}</span></div>
              </div>
              {/* Barre budget */}
              <div className="mt-3">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${Math.min(100, (parseFloat(p.depense)/parseFloat(p.budget||1))*100)}%`,
                    background: PLT_COLORS[p.plateforme],
                  }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  {Math.round((parseFloat(p.depense)/parseFloat(p.budget||1))*100)}% du budget consommé
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Liste des campagnes */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <h3 className="text-sm font-semibold text-gray-900">Campagnes ({campagnes.length})</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {loading ? (
            [...Array(4)].map((_,i) => <div key={i} className="p-4 h-16 animate-pulse bg-gray-50" />)
          ) : campagnes.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Megaphone size={32} className="mx-auto mb-3 opacity-30" />
              <p>Aucune campagne créée</p>
            </div>
          ) : (
            campagnes.map((c) => {
              const pctDepense = Math.min(100, (parseFloat(c.depense_actuelle)/parseFloat(c.budget_total||1))*100);
              const isExpanded = expanded === c.id;
              return (
                <div key={c.id}>
                  <div className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                          style={{ background: PLT_COLORS[c.plateforme] || '#888' }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-gray-900 truncate">{c.nom}</p>
                            <span className={`badge ${STATUTS_CLS[c.statut]}`}>{c.statut}</span>
                            <span className="badge badge-sky text-xs">{OBJECTIFS[c.objectif]}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            <p className="text-xs text-gray-500">
                              {PLATEFORMES[c.plateforme]} • {new Date(c.date_debut).toLocaleDateString('fr-FR')}
                              {c.date_fin ? ` → ${new Date(c.date_fin).toLocaleDateString('fr-FR')}` : ''}
                            </p>
                          </div>
                          {/* Barre budget */}
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-sky-500 transition-all"
                                style={{ width:`${pctDepense}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {fmtAr(c.depense_actuelle)} / {fmtAr(c.budget_total)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Métriques */}
                      <div className="hidden sm:flex items-center gap-6 flex-shrink-0 text-sm">
                        <div className="text-right">
                          <p className="text-xs text-gray-400">ROAS</p>
                          <p className={`font-bold ${parseFloat(c.roas||0)>=1?'text-green-600':'text-gray-400'}`}>
                            ×{Number(c.roas||0).toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">CPC</p>
                          <p className="font-medium text-gray-700">
                            {Number(c.cpc||0).toLocaleString('fr-MG',{maximumFractionDigits:0})} Ar
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Clics</p>
                          <p className="font-medium text-gray-700">{Number(c.clics||0).toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => { setSelected(c); setModal('depense'); }}
                          className="btn-ghost p-1.5 text-xs" title="Ajouter dépense">
                          <Plus size={14} />
                        </button>
                        <button onClick={() => { setSelected(c); setModal('edit'); }}
                          className="btn-ghost p-1.5" title="Modifier">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => setExpanded(isExpanded ? null : c.id)}
                          className="btn-ghost p-1.5" title="Détails">
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Détails dépliés */}
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                      <CampagneDepenses campagneId={c.id} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modals */}
      {modal === 'create'  && <ModalCampagne campagne={null}     onClose={()=>setModal(null)} onSuccess={()=>{setModal(null);fetchAll();}} />}
      {modal === 'edit'    && <ModalCampagne campagne={selected}  onClose={()=>setModal(null)} onSuccess={()=>{setModal(null);fetchAll();}} />}
      {modal === 'depense' && <ModalDepense  campagne={selected}  onClose={()=>setModal(null)} onSuccess={()=>{setModal(null);fetchAll();}} />}
    </div>
  );
}

// ── Sous-composant dépenses d'une campagne ────────────────────
function CampagneDepenses({ campagneId }) {
  const [depenses, setDepenses] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.get(`/ads/campagnes/${campagneId}/depenses`, { params: { limit: 10 } })
      .then(({ data: r }) => setDepenses(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [campagneId]);

  if (loading) return <div className="py-4 h-8 bg-gray-100 rounded animate-pulse mt-3" />;
  if (!depenses.length) return <p className="text-xs text-gray-400 py-3">Aucune dépense enregistrée</p>;

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="text-gray-500">
          <th className="text-left py-1.5 pr-4">Date</th>
          <th className="text-right pr-4">Dépense</th>
          <th className="text-right pr-4">Revenus</th>
          <th className="text-right pr-4">ROAS</th>
          <th className="text-right pr-4">Clics</th>
          <th className="text-right">CPC</th>
        </tr></thead>
        <tbody>
          {depenses.map((d) => (
            <tr key={d.id} className="border-t border-gray-200">
              <td className="py-1.5 pr-4 text-gray-600">{new Date(d.date).toLocaleDateString('fr-FR')}</td>
              <td className="text-right pr-4 font-medium">{Number(d.depense).toLocaleString('fr-MG',{maximumFractionDigits:0})}</td>
              <td className="text-right pr-4 text-green-600">{Number(d.revenus||0).toLocaleString('fr-MG',{maximumFractionDigits:0})}</td>
              <td className={`text-right pr-4 font-bold ${parseFloat(d.roas)>=1?'text-green-600':'text-red-500'}`}>×{Number(d.roas||0).toFixed(2)}</td>
              <td className="text-right pr-4 text-gray-600">{Number(d.clics||0).toLocaleString()}</td>
              <td className="text-right text-gray-600">{Number(d.cpc||0).toLocaleString('fr-MG',{maximumFractionDigits:0})}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
