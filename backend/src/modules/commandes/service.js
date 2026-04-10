const { parse } = require('dotenv');
const {query, withTransaction}=require('../../config/db');

// ── Transitions de statut autorisées ─────────────────────────
const TRANSACTIONS = {
    brouillon: ['confirmee','annulee'],
    confirmee: ['en_preparation','annulee'],
    en_preparation: ['expediee','annulee'],
    expediee:['livree'],
    livree:['remboursee'],
    annulee:[],
    remboursee:[],
};

const canTransaction = (from, to) => TRANSACTIONS[from]?.includes(to) ?? false;

// ── Calculer les totaux d'une commande ────────────────────────
const calculerTotaux = (lignes, remise_pct = 0, frais_livraison=0)=>{
    let sous_total_ht= 0;
    let total_tva= 0;

    const lignesCalculees = lignes.map((l) => {
        const prix_base     = l.prix_unitaire_ht*l.quantite;
        const remise_ligne  = prix_base*((l.remise_pct || 0) /100);
        const total_ht      = parseFloat((prix_base - remise_ligne).toFixed(4));
        const tva_montant   = parseFloat((total_ht * ((l.tva_taux || 20)/10)).toFixed(4));
        const total_ttc     = parseFloat((total_ht + tva_montant).toFixed(4));

        sous_total_ht += total_ht;
        total_tva     += tva_montant;

        return {...l, total_ht, total_ttc};
    });

    const remise_montant = parseFloat((sous_total_ht*(remise_pct/100)).toFixed(4));
    const total_ht = parseFloat((sous_total_ht - remise_montant)).toFixed(4);
    const total_ttc = parseFloat((total_ht+total_tva+frais_livraison).toFixed(4));

    return {
    lignesCalculees,
    sous_total_ht,
    remise_montant,
    total_ht,
    total_tva,
    total_ttc: parseFloat(total_ttc.toFixed(4)),
  };
};
  // ── GET ALL ───────────────────────────────────────────────────

  const getAll = async({search, statut, type, client_id, page=1, limit=20}) =>{
    const offset = (page -1) * limit;
    const conds  = ['1=1']; const params = []; let i=1;
    
    if(search){
        conds.push(`(c.numero ILIKE $${i} OR cli.nom ILIKE $${i} OR cli.prenom ILIKE $${i} OR cli.raison_sociale ILIKE $${i} )`);
        params.push(`%${search}%`); i++;
    }
    if (statut)    { conds.push(`c.statut = $${i}`);    params.push(statut);    i++; }
    if (type)      { conds.push(`c.type = $${i}`);      params.push(type);      i++; }
    if (client_id) { conds.push(`c.client_id = $${i}`); params.push(client_id); i++; }; 

    const where = conds.join(' AND ');

    const { rows: data } = await query(
        `SELECT c.*,
                COALESCE(cli.raison_sociale,cli.prenom || ' ' || cli.nom) AS client_nom,
                cli.email AS client_email,
                u.prenom || ' ' || u.nom AS vendeur_nom
                (SELECT COUNT(*) FROM commandes_lignes cl WHERE cl.commande_id = c.id) AS nb_lignes
        FROM commandes c
        LEFT JOIN clients cli ON cli.id = c.client_id
        LEFT JOIN users u     ON u.id   = c.vendeur_id
        WHERE ${where}
        ORDER BY c.created_at DESC
        LIMIT $${i} OFFSET $${i+1}`,
        [...params, limit, offset]
    );

    const { rows: cnt } = await query(
        `SELECT COUNT(*) FROM commandes
         LEFT JOIN clients cli ON cli.id=c.client_id
         WHERE ${where}`, params
    );

    return { data, total: parseInt(cnt[0].count), page: +page, limit: +limit };    
  };

  // ── GET ONE ───────────────────────────────────────────────────
const getOne = async (id) => {
  const { rows: cmd } = await query(
    `SELECT c.*,
            COALESCE(cli.raison_sociale, cli.prenom || ' ' || cli.nom) AS client_nom,
            cli.email AS client_email, cli.telephone AS client_tel,
            cli.adresse AS client_adresse,
            u.prenom || ' ' || u.nom AS vendeur_nom
     FROM commandes c
     LEFT JOIN clients cli ON cli.id = c.client_id
     LEFT JOIN users u     ON u.id   = c.vendeur_id
     WHERE c.id = $1`, [id]
  );
  if (!cmd[0]) { const e = new Error('Commande introuvable'); e.statusCode = 404; throw e; }
 
  const { rows: lignes } = await query(
    `SELECT * FROM commande_lignes WHERE commande_id = $1 ORDER BY created_at ASC`, [id]
  );
 
  const { rows: historique } = await query(
    `SELECT h.*, u.prenom || ' ' || u.nom AS auteur_nom
     FROM commande_historique h
     LEFT JOIN users u ON u.id = h.created_by
     WHERE h.commande_id = $1 ORDER BY h.created_at ASC`, [id]
  );
 
  return { ...cmd[0], lignes, historique };
};

// ── CREATE ────────────────────────────────────────────────────
const create = async (data, userId) => {
    return withTransaction(async, (client) => {
        const {
        type = 'vente', client_id, lignes, remise_pct = 0,
        frais_livraison = 0, paiement_mode, notes, notes_internes,
        adresse_livraison, date_disponibilite, acompte_verse,
        } = data;

        // Récupérer les infos produits pour snapshot
    const produitsIds = [...new Set(lignes.map((l) => l.produit_id))];
    const { rows: produits } = await client.query(
      `SELECT id, nom, reference, prix_vente_ht, tva_taux, stock_actuel
       FROM produits WHERE id = ANY($1)`, [produitsIds]
    );
    const produitsMap = Object.fromEntries(produits.map((p) => [p.id, p]));

    // Vérifier le stock pour les ventes
    if(type === 'vente'){
        for(const l of lignes){
            const p = produitsMap[l.produit_id];
            if (!p) { const e = new Error(`Produit ${l.produit_id} introuvable`); e.statusCode = 404; throw e;}
            if (p.stock_actuel < l.quantite){
                const e = new Error(`Stock insuffisant pour "${p.nom}"(dispo: ${p.stock_actuel})`);
                e.statusCode = 409; throw e;
            }
        }
    }

    // Enrichir les lignes avec les données produits
    const lignesEnrichies = lignes.map((l) =>{
        const p = produitsMap[l.produit_id];
        return {
            ...l,
        produit_nom:      p?.nom || l.produit_nom || '',
        produit_ref:      p?.reference || '',
        tva_taux:         l.tva_taux ?? p?.tva_taux ?? 20,
        prix_unitaire_ht: l.prix_unitaire_ht ?? p?.prix_vente_ht ?? 0,
        };
    });

    });
}
