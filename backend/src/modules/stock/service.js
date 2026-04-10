const { query, withTransaction } = require('../../config/db');

// ── Mouvement générique (réutilisé en interne) ────────────────
const creerMouvement = async (client, {
  produit_id, type, quantite, prix_unitaire,
  commande_id, reference_doc, motif, userId,
}) => {
  // Récupérer stock actuel avec verrou
  const { rows: [p] } = await client.query(
    'SELECT stock_actuel FROM produits WHERE id=$1 FOR UPDATE', [produit_id]
  );
  if (!p) { const e = new Error('Produit introuvable'); e.statusCode = 404; throw e; }

  const stock_avant = p.stock_actuel;
  const stock_apres = stock_avant + quantite; // quantite est négatif pour les sorties

  if (stock_apres < 0) {
    const e = new Error(`Stock insuffisant. Stock actuel : ${stock_avant}`);
    e.statusCode = 409; throw e;
  }

  const { rows: [mv] } = await client.query(
    `INSERT INTO stock_mouvements
       (produit_id, type, quantite, stock_avant, stock_apres,
        prix_unitaire, commande_id, reference_doc, motif, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [produit_id, type, quantite, stock_avant, stock_apres,
     prix_unitaire || null, commande_id || null,
     reference_doc || null, motif || null, userId]
  );

  // Le trigger met à jour stock_actuel, mais on le fait aussi explicitement
  await client.query(
    'UPDATE produits SET stock_actuel=$1 WHERE id=$2', [stock_apres, produit_id]
  );

  return mv;
};

// ── ENTRÉE de stock (réception achat, retour client) ──────────
const entree = async ({ produit_id, quantite, prix_unitaire, reference_doc, motif }, userId) => {
  return withTransaction(async (client) => {
    return creerMouvement(client, {
      produit_id,
      type:         'entree_achat',
      quantite:     parseInt(quantite),   // positif
      prix_unitaire,
      reference_doc,
      motif:        motif || 'Entrée stock',
      userId,
    });
  });
};

// ── SORTIE manuelle (perte, casse, don) ───────────────────────
const sortie = async ({ produit_id, quantite, motif }, userId) => {
  return withTransaction(async (client) => {
    return creerMouvement(client, {
      produit_id,
      type:     'sortie_perte',
      quantite: -parseInt(quantite),   // négatif
      motif,
      userId,
    });
  });
};

// ── AJUSTEMENT (correction de stock après comptage) ───────────
const ajustement = async ({ produit_id, stock_reel, motif }, userId) => {
  return withTransaction(async (client) => {
    const { rows: [p] } = await client.query(
      'SELECT stock_actuel FROM produits WHERE id=$1', [produit_id]
    );
    if (!p) { const e = new Error('Produit introuvable'); e.statusCode = 404; throw e; }

    const ecart = stock_reel - p.stock_actuel;
    if (ecart === 0) return { message: 'Pas d\'écart, aucun ajustement nécessaire' };

    const type = ecart > 0 ? 'entree_ajustement' : 'sortie_ajustement';

    return creerMouvement(client, {
      produit_id,
      type,
      quantite: ecart,
      motif:    motif || `Ajustement : ${ecart > 0 ? '+' : ''}${ecart} unités`,
      userId,
    });
  });
};

// ── LISTE des mouvements ──────────────────────────────────────
const getMouvements = async ({ produit_id, type, page = 1, limit = 30 }) => {
  const offset = (page - 1) * limit;
  const conds  = ['1=1']; const params = []; let i = 1;

  if (produit_id) { conds.push(`sm.produit_id = $${i}`); params.push(produit_id); i++; }
  if (type)       { conds.push(`sm.type = $${i}`);        params.push(type);       i++; }

  const where = conds.join(' AND ');

  const { rows: data } = await query(
    `SELECT sm.*,
            p.nom AS produit_nom, p.reference AS produit_ref,
            u.prenom || ' ' || u.nom AS auteur_nom
     FROM stock_mouvements sm
     JOIN produits p     ON p.id = sm.produit_id
     LEFT JOIN users u   ON u.id = sm.created_by
     WHERE ${where}
     ORDER BY sm.created_at DESC
     LIMIT $${i} OFFSET $${i+1}`,
    [...params, limit, offset]
  );

  const { rows: cnt } = await query(
    `SELECT COUNT(*) FROM stock_mouvements sm WHERE ${where}`, params
  );

  return { data, total: parseInt(cnt[0].count), page: +page, limit: +limit };
};

// ── Mouvements d'un produit spécifique ────────────────────────
const getMouvementsProduit = async (produit_id, { page = 1, limit = 20 } = {}) => {
  return getMouvements({ produit_id, page, limit });
};

// ── Valeur totale du stock ────────────────────────────────────
const getValeurStock = async () => {
  const { rows } = await query(`SELECT * FROM v_valeur_stock ORDER BY valeur_achat DESC`);
  const { rows: [totaux] } = await query(`
    SELECT
      SUM(stock_actuel * prix_achat_ht)  AS valeur_achat_totale,
      SUM(stock_actuel * prix_vente_ht)  AS valeur_vente_totale,
      COUNT(*)                            AS nb_produits,
      SUM(stock_actuel)                  AS unites_totales
    FROM produits WHERE statut = 'actif'
  `);
  return { parCategorie: rows, totaux: totaux || {} };
};

// ── INVENTAIRE ────────────────────────────────────────────────
const creerInventaire = async ({ lignes, notes }, userId) => {
  return withTransaction(async (client) => {
    // Créer l'inventaire
    const { rows: [inv] } = await client.query(
      `INSERT INTO inventaires (reference, notes, created_by)
       VALUES ('INV-' || TO_CHAR(NOW(), 'YYYY-MM-DD-HH24MI'), $1, $2)
       RETURNING *`,
      [notes || null, userId]
    );

    // Insérer les lignes avec stock théorique (actuel au moment de l'inventaire)
    for (const l of lignes) {
      const { rows: [p] } = await client.query(
        'SELECT stock_actuel FROM produits WHERE id=$1', [l.produit_id]
      );
      if (!p) continue;

      await client.query(
        `INSERT INTO inventaire_lignes
           (inventaire_id, produit_id, stock_theorique, stock_reel, notes)
         VALUES ($1,$2,$3,$4,$5)`,
        [inv.id, l.produit_id, p.stock_actuel, l.stock_reel, l.notes || null]
      );
    }

    return inv;
  });
};

// ── Valider un inventaire → appliquer les ajustements ────────
const validerInventaire = async (id, userId) => {
  return withTransaction(async (client) => {
    const { rows: [inv] } = await client.query(
      'SELECT * FROM inventaires WHERE id=$1', [id]
    );
    if (!inv) { const e = new Error('Inventaire introuvable'); e.statusCode = 404; throw e; }
    if (inv.statut !== 'en_cours') {
      const e = new Error('Inventaire déjà validé ou annulé'); e.statusCode = 409; throw e;
    }

    const { rows: lignes } = await client.query(
      'SELECT * FROM inventaire_lignes WHERE inventaire_id=$1', [id]
    );

    // Appliquer les ajustements pour chaque écart
    for (const l of lignes) {
      const ecart = l.stock_reel - l.stock_theorique;
      if (ecart !== 0) {
        await creerMouvement(client, {
          produit_id: l.produit_id,
          type:       ecart > 0 ? 'entree_ajustement' : 'sortie_ajustement',
          quantite:   ecart,
          motif:      `Inventaire ${inv.reference}`,
          userId,
        });
      }
    }

    // Valider l'inventaire
    const { rows: [updated] } = await client.query(
      `UPDATE inventaires SET statut='valide', validated_by=$1, validated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [userId, id]
    );

    return updated;
  });
};

// ── Liste des inventaires ─────────────────────────────────────
const getInventaires = async ({ page = 1, limit = 10 } = {}) => {
  const offset = (page - 1) * limit;
  const { rows: data } = await query(
    `SELECT i.*,
            u1.prenom || ' ' || u1.nom AS createur_nom,
            u2.prenom || ' ' || u2.nom AS validateur_nom,
            COUNT(il.id) AS nb_lignes,
            SUM(ABS(il.ecart)) AS total_ecarts
     FROM inventaires i
     LEFT JOIN users u1         ON u1.id = i.created_by
     LEFT JOIN users u2         ON u2.id = i.validated_by
     LEFT JOIN inventaire_lignes il ON il.inventaire_id = i.id
     GROUP BY i.id, u1.prenom, u1.nom, u2.prenom, u2.nom
     ORDER BY i.created_at DESC
     LIMIT $1 OFFSET $2`, [limit, offset]
  );
  const { rows: cnt } = await query('SELECT COUNT(*) FROM inventaires');
  return { data, total: parseInt(cnt[0].count), page: +page, limit: +limit };
};

module.exports = {
  entree, sortie, ajustement,
  getMouvements, getMouvementsProduit, getValeurStock,
  creerInventaire, validerInventaire, getInventaires,
  creerMouvement,  // exporté pour usage interne (commandes)
};