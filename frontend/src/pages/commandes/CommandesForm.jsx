import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Search, Save, AlertCircle } from 'lucide-react';
import api         from '../../api/axios';
import useUiStore  from '../../store/uiStore';
import useAuthStore from '../../store/authStore';
import toast        from 'react-hot-toast';

// ── Config priorité ───────────────────────────────────────────
const PRIORITE_CONFIG = {
  1: { label:'Urgent',   cls:'badge-red',   desc:'Premier servi — stock réservé en priorité' },
  2: { label:'Normal',   cls:'badge-amber', desc:'Priorité standard' },
  3: { label:'Faible',   cls:'badge-gray',  desc:'Traité en dernier' },
};

// ── Sélecteur de produit avec recherche ───────────────────────
function ProduitPicker({ onSelect }) {
  const [search,   setSearch]   = useState('');
  const [produits, setProduits] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [open,     setOpen]     = useState(false);

  useEffect(() => {
    if (!search.trim()) { setProduits([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data: res } = await api.get('/produits', { params:{ search, limit:10 } });
        setProduits(res.data || []);
      } catch { setProduits([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const select = (p) => {
    onSelect(p);
    setSearch('');
    setProduits([]);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
        <input
          type="text"
          value={search}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          className="input-field pl-9 pr-4 text-sm"
          placeholder="Rechercher un produit à ajouter…"
        />
      </div>
      {open && (search.length > 0) && (
        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">Recherche…</div>
          ) : produits.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">Aucun produit trouvé</div>
          ) : (
            produits.map((p) => (
              <button key={p.id} onClick={() => select(p)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.nom}</p>
                  <p className="text-xs text-gray-400">{p.reference} • Stock : {p.stock_actuel}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-sm font-semibold text-gray-900">
                    {Number(p.prix_vente_ttc).toLocaleString('fr-MG',{maximumFractionDigits:0})} Ar
                  </p>
                  <span className={`badge text-[10px] ${p.stock_actuel<=0?'badge-red':p.stock_actuel<=p.stock_minimum?'badge-amber':'badge-green'}`}>
                    {p.stock_actuel<=0?'Rupture':p.stock_actuel<=p.stock_minimum?'Alerte':'En stock'}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────
export default function CommandesForm() {
  const navigate     = useNavigate();
  const setPageTitle = useUiStore((s) => s.setPageTitle);
  const currentUser  = useAuthStore((s) => s.user);

  const [lignes,       setLignes]       = useState([]);
  const [clients,      setClients]      = useState([]);
  const [clientId,     setClientId]     = useState('');
  const [type,         setType]         = useState('vente');
  const [remisePct,    setRemisePct]    = useState(0);
  const [fraisLiv,     setFraisLiv]     = useState(0);
  const [paiementMode, setPaiementMode] = useState('especes');
  const [notes,        setNotes]        = useState('');
  const [priorite,     setPriorite]     = useState(2);
  const [prioriteMotif,setPrioriteMotif]= useState('');
  const [dateDispo,    setDateDispo]    = useState('');
  const [acompte,      setAcompte]      = useState('');
  const [saving,       setSaving]       = useState(false);

  useEffect(() => { setPageTitle('Nouvelle commande'); }, [setPageTitle]);

  useEffect(() => {
    api.get('/clients', { params:{ limit:200 } })
      .then(({ data:r }) => setClients(r.data || []))
      .catch(() => {});
  }, []);

  // ── Gestion des lignes ────────────────────────────────────
  const addLigne = (produit) => {
    setLignes((prev) => {
      const exists = prev.find((l) => l.produit_id === produit.id);
      if (exists) {
        return prev.map((l) => l.produit_id === produit.id
          ? { ...l, quantite: l.quantite + 1 }
          : l
        );
      }
      return [...prev, {
        produit_id:       produit.id,
        produit_nom:      produit.nom,
        produit_ref:      produit.reference,
        stock_actuel:     produit.stock_actuel,
        stock_minimum:    produit.stock_minimum,
        quantite:         1,
        prix_unitaire_ht: parseFloat(produit.prix_vente_ht),
        tva_taux:         parseFloat(produit.tva_taux),
        remise_pct:       0,
      }];
    });
  };

  const updateLigne = (idx, field, value) => {
    setLignes((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const removeLigne = (idx) => {
    setLignes((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Calculs ───────────────────────────────────────────────
  const lignesCalc = lignes.map((l) => {
    const base     = l.prix_unitaire_ht * l.quantite;
    const remLigne = base * ((l.remise_pct || 0) / 100);
    const totHT    = base - remLigne;
    const totTTC   = totHT * (1 + l.tva_taux / 100);
    return { ...l, total_ht: totHT, total_ttc: totTTC };
  });

  const sousTotalHT    = lignesCalc.reduce((s, l) => s + l.total_ht, 0);
  const remiseMontant  = sousTotalHT * (remisePct / 100);
  const totalHT        = sousTotalHT - remiseMontant;
  const totalTVA       = lignesCalc.reduce((s, l) => s + (l.total_ht * l.tva_taux / 100), 0);
  const totalTTC       = totalHT + totalTVA + parseFloat(fraisLiv || 0);

  // Produits en rupture dans les lignes
  const ruptures = lignesCalc.filter((l) => l.stock_actuel < l.quantite);

  // ── Soumission ────────────────────────────────────────────
  const handleSubmit = async () => {
    if (lignes.length === 0) return toast.error('Ajoutez au moins un produit');
    setSaving(true);
    try {
      const payload = {
        type,
        client_id:        clientId || null,
        lignes:           lignesCalc.map((l) => ({
          produit_id:        l.produit_id,
          produit_nom:       l.produit_nom,
          quantite:          parseInt(l.quantite),
          prix_unitaire_ht:  parseFloat(l.prix_unitaire_ht),
          tva_taux:          parseFloat(l.tva_taux),
          remise_pct:        parseFloat(l.remise_pct || 0),
        })),
        remise_pct:       parseFloat(remisePct || 0),
        frais_livraison:  parseFloat(fraisLiv || 0),
        paiement_mode:    paiementMode || null,
        notes:            notes || null,
        priorite:         parseInt(priorite),
        priorite_motif:   prioriteMotif || null,
        date_disponibilite: type === 'precommande' && dateDispo ? dateDispo : null,
        acompte_verse:    type === 'precommande' && acompte ? parseFloat(acompte) : null,
      };
      const { data: res } = await api.post('/commandes', payload);
      toast.success(`Commande ${res.data.numero} créée`);
      navigate(`/commandes/${res.data.id}`);
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const fmtAr = (v) => Number(v||0).toLocaleString('fr-MG',{maximumFractionDigits:0});

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/commandes')} className="btn-ghost p-2"><ArrowLeft size={18}/></button>
          <div>
            <h2 className="page-title">Nouvelle commande</h2>
            <p className="page-subtitle">Vendeur : {currentUser?.prenom} {currentUser?.nom}</p>
          </div>
        </div>
        <button onClick={handleSubmit} disabled={saving || lignes.length === 0} className="btn-primary">
          {saving
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Création…</>
            : <><Save size={16}/>Créer la commande</>
          }
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">

          {/* Avertissement ruptures */}
          {ruptures.length > 0 && type === 'vente' && (
            <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5"/>
              <div>
                <p className="text-sm font-medium text-amber-800">Stock insuffisant</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {ruptures.map((r) => `${r.produit_nom} (dispo: ${r.stock_actuel}, demandé: ${r.quantite})`).join(' • ')}
                </p>
              </div>
            </div>
          )}

          {/* Produits */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                Produits <span className="badge badge-sky">{lignes.length}</span>
              </h3>
            </div>
            <div className="card-body space-y-4">
              {/* Chercher produit */}
              <ProduitPicker onSelect={addLigne} />

              {/* Lignes */}
              {lignesCalc.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Produit</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-20">Qté</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-28">Prix HT</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-20">Remise</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-28">Total TTC</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lignesCalc.map((l, idx) => (
                        <tr key={idx} className={l.stock_actuel < l.quantite && type==='vente' ? 'bg-red-50' : ''}>
                          <td className="px-3 py-2">
                            <p className="font-medium text-gray-900">{l.produit_nom}</p>
                            <p className="text-xs text-gray-400">{l.produit_ref}</p>
                            {l.stock_actuel < l.quantite && type==='vente' && (
                              <p className="text-xs text-red-500">Stock dispo : {l.stock_actuel}</p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min="1" value={l.quantite}
                              onChange={(e) => updateLigne(idx,'quantite',parseInt(e.target.value)||1)}
                              className="input-field text-right text-sm py-1 px-2 w-16"/>
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" min="0" step="0.01" value={l.prix_unitaire_ht}
                              onChange={(e) => updateLigne(idx,'prix_unitaire_ht',parseFloat(e.target.value)||0)}
                              className="input-field text-right text-sm py-1 px-2 w-24"/>
                          </td>
                          <td className="px-3 py-2">
                            <div className="relative">
                              <input type="number" min="0" max="100" step="0.5" value={l.remise_pct||0}
                                onChange={(e) => updateLigne(idx,'remise_pct',parseFloat(e.target.value)||0)}
                                className="input-field text-right text-sm py-1 pl-2 pr-6 w-16"/>
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-900">
                            {fmtAr(l.total_ttc)} Ar
                          </td>
                          <td className="px-2 py-2">
                            <button onClick={() => removeLigne(idx)}
                              className="p-1 rounded text-red-400 hover:bg-red-50 transition-colors">
                              <Trash2 size={14}/>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {lignes.length === 0 && (
                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                  <Plus size={24} className="mx-auto mb-2 opacity-40"/>
                  <p className="text-sm">Recherchez et ajoutez des produits ci-dessus</p>
                </div>
              )}
            </div>
          </div>

          {/* Totaux */}
          {lignes.length > 0 && (
            <div className="card">
              <div className="card-header"><h3 className="text-sm font-semibold text-gray-900">Totaux</h3></div>
              <div className="card-body">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Sous-total HT</span>
                    <span>{fmtAr(sousTotalHT)} Ar</span>
                  </div>
                  {remisePct > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Remise ({remisePct}%)</span>
                      <span>-{fmtAr(remiseMontant)} Ar</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>TVA</span>
                    <span>{fmtAr(totalTVA)} Ar</span>
                  </div>
                  {fraisLiv > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Frais de livraison</span>
                      <span>{fmtAr(fraisLiv)} Ar</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t">
                    <span>Total TTC</span>
                    <span>{fmtAr(totalTTC)} Ar</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">

          {/* Type de commande */}
          <div className="card">
            <div className="card-header"><h3 className="text-sm font-semibold text-gray-900">Type</h3></div>
            <div className="card-body space-y-3">
              {[
                { val:'vente',       label:'Vente directe',   desc:'Stock déduit immédiatement' },
                { val:'precommande', label:'Précommande',     desc:'Article non disponible' },
                { val:'devis',       label:'Devis',           desc:'Sans impact sur le stock' },
              ].map(({ val, label, desc }) => (
                <label key={val} className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  type===val ? 'border-sky-500 bg-sky-50' : 'border-gray-200'
                }`}>
                  <input type="radio" name="type" value={val} checked={type===val}
                    onChange={() => setType(val)} className="mt-0.5"/>
                  <div>
                    <p className={`text-sm font-medium ${type===val?'text-sky-700':'text-gray-700'}`}>{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Priorité */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-900">Priorité</h3>
            </div>
            <div className="card-body space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[1,2,3].map((p) => {
                  const cfg = PRIORITE_CONFIG[p];
                  return (
                    <button key={p} type="button"
                      onClick={() => setPriorite(p)}
                      className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all text-center ${
                        priorite===p
                          ? p===1 ? 'border-red-400 bg-red-50' : p===2 ? 'border-amber-400 bg-amber-50' : 'border-gray-300 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <span className={`text-lg font-black ${p===1?'text-red-600':p===2?'text-amber-600':'text-gray-500'}`}>P{p}</span>
                      <span className="text-xs font-medium text-gray-700 mt-1">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                {PRIORITE_CONFIG[priorite].desc}
              </p>
              <div>
                <label className="label text-xs">Motif (optionnel)</label>
                <input type="text" value={prioriteMotif} onChange={(e)=>setPrioriteMotif(e.target.value)}
                  className="input-field text-sm" placeholder="Justification de la priorité…"/>
              </div>
            </div>
          </div>

          {/* Précommande spécifique */}
          {type === 'precommande' && (
            <div className="card">
              <div className="card-header"><h3 className="text-sm font-semibold text-gray-900">Précommande</h3></div>
              <div className="card-body space-y-3">
                <div>
                  <label className="label">Date de disponibilité prévue</label>
                  <input type="date" value={dateDispo} onChange={(e)=>setDateDispo(e.target.value)}
                    className="input-field"/>
                </div>
                <div>
                  <label className="label">Acompte versé (Ar)</label>
                  <input type="number" min="0" value={acompte} onChange={(e)=>setAcompte(e.target.value)}
                    className="input-field" placeholder="0"/>
                </div>
              </div>
            </div>
          )}

          {/* Client */}
          <div className="card">
            <div className="card-header"><h3 className="text-sm font-semibold text-gray-900">Client</h3></div>
            <div className="card-body">
              <select value={clientId} onChange={(e)=>setClientId(e.target.value)}
                className="input-field appearance-none">
                <option value="">— Anonyme —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.type==='professionnel' ? c.raison_sociale : `${c.prenom||''} ${c.nom||''}`.trim()} {c.email ? `(${c.email})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Réductions & frais */}
          <div className="card">
            <div className="card-header"><h3 className="text-sm font-semibold text-gray-900">Réductions & frais</h3></div>
            <div className="card-body space-y-3">
              <div>
                <label className="label">Remise globale (%)</label>
                <input type="number" min="0" max="100" value={remisePct}
                  onChange={(e)=>setRemisePct(parseFloat(e.target.value)||0)}
                  className="input-field" placeholder="0"/>
              </div>
              <div>
                <label className="label">Frais de livraison (Ar)</label>
                <input type="number" min="0" value={fraisLiv}
                  onChange={(e)=>setFraisLiv(parseFloat(e.target.value)||0)}
                  className="input-field" placeholder="0"/>
              </div>
              <div>
                <label className="label">Mode de paiement</label>
                <select value={paiementMode} onChange={(e)=>setPaiementMode(e.target.value)}
                  className="input-field appearance-none">
                  <option value="especes">Espèces</option>
                  <option value="mobile_money">Mobile money</option>
                  <option value="carte">Carte bancaire</option>
                  <option value="virement">Virement</option>
                  <option value="cheque">Chèque</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="card">
            <div className="card-header"><h3 className="text-sm font-semibold text-gray-900">Notes</h3></div>
            <div className="card-body">
              <textarea value={notes} onChange={(e)=>setNotes(e.target.value)}
                rows={3} className="input-field resize-none text-sm" placeholder="Instructions, remarques…"/>
            </div>
          </div>

          {/* CTA */}
          <button onClick={handleSubmit} disabled={saving || lignes.length===0}
            className="btn-primary w-full justify-center py-3 text-base">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Création…</>
              : <><Save size={16}/>Créer la commande {lignes.length > 0 && `(${fmtAr(totalTTC)} Ar)`}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
