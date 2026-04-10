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
        `SELECT COUNT(*)  
         FROM commandes
         LEFT JOIN clients cli ON cli.id=c.client_id
         WHERE ${where}`, params
    );

    return { data, total: parseInt(cnt[0].count), page: +page, limit: +limit };    
  };