import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer, RefreshCw } from 'lucide-react';
import api        from '../../api/axios';
import useUiStore from '../../store/uiStore';
import toast      from 'react-hot-toast';
import html2canvas from 'html2canvas';

// ── Composant ticket ──────────────────────────────────────────
function Ticket({ recu }) {
  const d = recu.data_json;
  const cmd     = d?.commande  || {};
  const lignes  = d?.lignes    || [];
  const config  = d?.config    || {};

  const fmtAr = (v) => Number(v||0).toLocaleString('fr-MG',{maximumFractionDigits:0});

  return (
    <div
      style={{
        width:       '320px',
        background:  '#ffffff',
        padding:     '24px 20px',
        fontFamily:  '"Courier New", Courier, monospace',
        fontSize:    '12px',
        color:       '#111111',
        lineHeight:  '1.5',
      }}
    >
      {/* En-tête boutique */}
      <div style={{ textAlign:'center', borderBottom:'1px dashed #ccc', paddingBottom:'12px', marginBottom:'12px' }}>
        {recu.boutique_logo && (
          <img src={recu.boutique_logo} alt="logo"
            style={{ height:'40px', objectFit:'contain', marginBottom:'8px' }} />
        )}
        <div style={{ fontWeight:'bold', fontSize:'15px', letterSpacing:'0.05em' }}>
          {recu.boutique_nom || 'NYXON'}
        </div>
        {recu.boutique_adresse && (
          <div style={{ fontSize:'11px', color:'#555', marginTop:'2px' }}>{recu.boutique_adresse}</div>
        )}
        {recu.boutique_tel && (
          <div style={{ fontSize:'11px', color:'#555' }}>Tél : {recu.boutique_tel}</div>
        )}
        {recu.boutique_email && (
          <div style={{ fontSize:'11px', color:'#555' }}>{recu.boutique_email}</div>
        )}
      </div>

      {/* Infos commande */}
      <div style={{ marginBottom:'12px', fontSize:'11px' }}>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>Reçu :</span>
          <strong>{recu.numero}</strong>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>Commande :</span>
          <strong>{cmd.numero}</strong>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>Date :</span>
          <span>{new Date(cmd.created_at||Date.now()).toLocaleString('fr-FR')}</span>
        </div>
        {cmd.client_nom && (
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span>Client :</span>
            <span>{cmd.client_nom}</span>
          </div>
        )}
        {cmd.vendeur_nom && (
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span>Vendeur :</span>
            <span>{cmd.vendeur_nom}</span>
          </div>
        )}
      </div>

      {/* Séparateur */}
      <div style={{ borderTop:'1px dashed #ccc', marginBottom:'10px' }} />

      {/* Lignes */}
      <div style={{ marginBottom:'10px' }}>
        {lignes.map((l, i) => (
          <div key={i} style={{ marginBottom:'8px' }}>
            <div style={{ fontWeight:'bold', fontSize:'11px' }}>{l.produit_nom}</div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:'#444' }}>
              <span>{l.quantite} × {fmtAr(l.prix_unitaire_ht)} Ar HT</span>
              <span>{fmtAr(l.total_ttc)} Ar</span>
            </div>
            {l.remise_pct > 0 && (
              <div style={{ fontSize:'10px', color:'#888' }}>  Remise : -{l.remise_pct}%</div>
            )}
          </div>
        ))}
      </div>

      {/* Séparateur */}
      <div style={{ borderTop:'1px dashed #ccc', marginBottom:'10px' }} />

      {/* Totaux */}
      <div style={{ fontSize:'11px' }}>
        {[
          { label:'Sous-total HT', value: fmtAr(cmd.sous_total_ht) },
          cmd.remise_montant > 0 && { label:`Remise (${cmd.remise_pct}%)`, value:`-${fmtAr(cmd.remise_montant)}` },
          { label:'TVA',           value: fmtAr(cmd.total_tva) },
          cmd.frais_livraison > 0 && { label:'Livraison', value: fmtAr(cmd.frais_livraison) },
        ].filter(Boolean).map((row) => (
          <div key={row.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:'2px' }}>
            <span style={{ color:'#555' }}>{row.label}</span>
            <span>{row.value} Ar</span>
          </div>
        ))}
        <div style={{
          display:'flex', justifyContent:'space-between',
          fontWeight:'bold', fontSize:'14px',
          borderTop:'1px solid #111', marginTop:'6px', paddingTop:'6px',
        }}>
          <span>TOTAL TTC</span>
          <span>{fmtAr(cmd.total_ttc)} Ar</span>
        </div>
      </div>

      {/* Paiement */}
      {cmd.paiement_mode && (
        <div style={{ marginTop:'8px', fontSize:'11px', color:'#555', textAlign:'center' }}>
          Paiement : {cmd.paiement_mode} —
          Payé : {fmtAr(cmd.montant_paye)} Ar
        </div>
      )}

      {/* Pied */}
      <div style={{
        borderTop:'1px dashed #ccc', marginTop:'14px', paddingTop:'12px',
        textAlign:'center', fontSize:'11px', color:'#666',
      }}>
        {recu.message_pied || 'Merci de votre visite !'}
        <div style={{ fontSize:'10px', color:'#999', marginTop:'6px' }}>
          Généré par Nyxon • {new Date().toLocaleDateString('fr-FR')}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function RecuDetail() {
  const { commandeId } = useParams();
  const navigate       = useNavigate();
  const setPageTitle   = useUiStore((s) => s.setPageTitle);
  const ticketRef      = useRef(null);

  const [recu,      setRecu]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { setPageTitle('Reçu'); }, [setPageTitle]);

  const loadOrGenerate = async () => {
    setLoading(true);
    try {
      // Tenter de régénérer (upsert)
      const { data: res } = await api.post(`/recus/generer/${commandeId}`);
      setRecu(res.data);
    } catch (err) {
      toast.error(err.message || 'Erreur génération reçu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrGenerate(); }, [commandeId]);

  const exportJPEG = async () => {
    if (!ticketRef.current) return;
    setExporting(true);
    try {
    // Chargement dynamique de html2canvas (pas de bundle si non utilisé)
    //   const { default: html2canvas } = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js');
      const canvas = await html2canvas(ticketRef.current, {
        scale:           3,
        useCORS:         true,
        backgroundColor: '#ffffff',
        logging:         false,
      });
      const url  = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.href     = url;
      link.download = `recu-${recu?.numero || commandeId}.jpg`;
      link.click();
      toast.success('Reçu exporté en JPEG');
    } catch (err) {
      // Fallback : impression navigateur
      toast.error('Export JPEG indisponible, utilisez l\'impression');
      window.print();
    } finally {
      setExporting(false);
    }
  };

  const imprimer = () => window.print();

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      {/* En-tête */}
      <div className="page-header print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-ghost p-2">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="page-title">Reçu</h2>
            {recu && <p className="page-subtitle">{recu.numero}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadOrGenerate} className="btn-secondary px-3" title="Régénérer">
            <RefreshCw size={15} />
          </button>
          <button onClick={imprimer} className="btn-secondary">
            <Printer size={15} /> Imprimer
          </button>
          <button onClick={exportJPEG} disabled={exporting || !recu} className="btn-primary">
            {exporting
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Export…</>
              : <><Download size={15} /> Exporter JPEG</>
            }
          </button>
        </div>
      </div>

      {/* Ticket centré */}
      {recu ? (
        <div className="flex justify-center">
          <div>
            {/* Ombre pour la preview */}
            <div className="shadow-xl rounded-sm overflow-hidden print:shadow-none" ref={ticketRef}>
              <Ticket recu={recu} />
            </div>
            <p className="text-xs text-gray-400 text-center mt-3 print:hidden">
              Largeur : 320px • Format ticket de caisse
            </p>
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center text-gray-400">
          Impossible de générer le reçu pour cette commande
        </div>
      )}

      {/* Styles d'impression */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #root > div > div > main > div > div > div,
          #root > div > div > main > div > div > div * { visibility: visible; }
          #root > div > div > main > div > div > div { position: absolute; left: 0; top: 0; }
        }
      `}</style>
    </div>
  );
}
