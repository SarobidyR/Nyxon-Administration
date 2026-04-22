const { query, withTransaction } = require('../../config/db');

// ── Transitions de statut autorisées ─────────────────────────
const TRANSITIONS = {
  brouillon:      ['confirmee', 'annulee'],
  confirmee:      ['en_preparation', 'annulee'],
  en_preparation: ['expediee', 'annulee'],
  expediee:       ['livree'],
  livree:         ['remboursee'],
  annulee:        [],
  remboursee:     [],
};

const canTransition = (from, to) => TRANSITIONS[from]?.includes(to) ?? false;

// ── Calculer les totaux d'une commande ────────────────────────
const calculerTotaux = (lignes, remise_pct = 0, frais_livraison = 0) => {
  let sous_total_ht = 0;
  let total_tva     = 0;

  const lignesCalculees = lignes.map((l) => {
    const prix_base    = l.prix_unitaire_ht * l.quantite;
    const remise_ligne = prix_base * ((l.remise_pct || 0) / 100);
    const total_ht     = parseFloat((prix_base - remise_ligne).toFixed(4));
    const tva_montant  = parseFloat((total_ht * ((l.tva_taux || 20) / 100)).toFixed(4));
    const total_ttc    = parseFloat((total_ht + tva_montant).toFixed(4));

    sous_total_ht += total_ht;
    total_tva     += tva_montant;

    return { ...l, total_ht, total_ttc };
  });

  const remise_montant = parseFloat((sous_total_ht * (remise_pct / 100)).toFixed(4));
  const total_ht       = parseFloat((sous_total_ht - remise_montant).toFixed(4));
  const total_ttc      = parseFloat((total_ht + total_tva + frais_livraison).toFixed(4));

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
const getAll = async ({ search, statut, type, client_id, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  const conds  = ['1=1']; const params = []; let i = 1;

  if (search) {
    conds.push(`(c.numero ILIKE $${i} OR cli.nom ILIKE $${i} OR cli.prenom ILIKE $${i} OR cli.raison_sociale ILIKE $${i})`);
    params.push(`%${search}%`); i++;
  }
  if (statut)    { conds.push(`c.statut = $${i}`);    params.push(statut);    i++; }
  if (type)      { conds.push(`c.type = $${i}`);      params.push(type);      i++; }
  if (client_id) { conds.push(`c.client_id = $${i}`); params.push(client_id); i++; }

  const where = conds.join(' AND ');

  const { rows: data } = await query(
    `SELECT c.*,
            COALESCE(cli.raison_sociale, cli.prenom || ' ' || cli.nom) AS client_nom,
            cli.email AS client_email,
            u.prenom || ' ' || u.nom AS vendeur_nom,
            (SELECT COUNT(*) FROM commande_lignes cl WHERE cl.commande_id = c.id) AS nb_lignes
     FROM commandes c
     LEFT JOIN clients cli ON cli.id = c.client_id
     LEFT JOIN users u     ON u.id   = c.vendeur_id
     WHERE ${where}
     ORDER BY c.created_at DESC
     LIMIT $${i} OFFSET $${i+1}`,
    [...params, limit, offset]
  );

  const { rows: cnt } = await query(
    `SELECT COUNT(*) FROM commandes c
     LEFT JOIN clients cli ON cli.id = c.client_id
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
  return withTransaction(async (client) => {
    const {
      type = 'vente', client_id, lignes, remise_pct = 0,
      frais_livraison = 0, paiement_mode, notes, notes_internes,
      adresse_livraison, date_disponibilite, acompte_verse,
      priorite = 2, priorite_motif,
    } = data;

    // Récupérer les infos produits pour snapshot
    const produitsIds = [...new Set(lignes.map((l) => l.produit_id))];
    const { rows: produits } = await client.query(
      `SELECT id, nom, reference, prix_vente_ht, tva_taux, stock_actuel
       FROM produits WHERE id = ANY($1)`, [produitsIds]
    );
    const produitsMap = Object.fromEntries(produits.map((p) => [p.id, p]));

    // Vérifier le stock pour les ventes
    if (type === 'vente') {
      for (const l of lignes) {
        const p = produitsMap[l.produit_id];
        if (!p) { const e = new Error(`Produit ${l.produit_id} introuvable`); e.statusCode = 404; throw e; }
        if (p.stock_actuel < l.quantite) {
          const e = new Error(`Stock insuffisant pour "${p.nom}" (dispo: ${p.stock_actuel})`);
          e.statusCode = 409; throw e;
        }
      }
    }

    // Enrichir les lignes avec les données produits
    const lignesEnrichies = lignes.map((l) => {
      const p = produitsMap[l.produit_id];
      return {
        ...l,
        produit_nom:      p?.nom || l.produit_nom || '',
        produit_ref:      p?.reference || '',
        tva_taux:         l.tva_taux ?? p?.tva_taux ?? 20,
        prix_unitaire_ht: l.prix_unitaire_ht ?? p?.prix_vente_ht ?? 0,
      };
    });

    const { lignesCalculees, sous_total_ht, remise_montant, total_ht, total_tva, total_ttc } =
      calculerTotaux(lignesEnrichies, remise_pct, frais_livraison);

    // Insérer la commande
    const { rows: [cmd] } = await client.query(
      `INSERT INTO commandes
         (type, client_id, vendeur_id, sous_total_ht, remise_pct, remise_montant,
          total_ht, total_tva, frais_livraison, total_ttc, paiement_mode,
          notes, notes_internes, adresse_livraison, date_disponibilite, acompte_verse,
          priorite, priorite_motif, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       RETURNING *`,
      [type, client_id || null, userId, sous_total_ht, remise_pct, remise_montant,
       total_ht, total_tva, frais_livraison, total_ttc, paiement_mode || null,
       notes || null, notes_internes || null, adresse_livraison || null,
       date_disponibilite || null, acompte_verse || null,
       parseInt(priorite) || 2, priorite_motif || null, userId]
    );

    // Insérer les lignes
    for (const l of lignesCalculees) {
      await client.query(
        `INSERT INTO commande_lignes
           (commande_id, produit_id, variante_id, produit_nom, produit_ref,
            quantite, prix_unitaire_ht, tva_taux, remise_pct, total_ht, total_ttc)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [cmd.id, l.produit_id, l.variante_id || null, l.produit_nom, l.produit_ref,
         l.quantite, l.prix_unitaire_ht, l.tva_taux, l.remise_pct || 0, l.total_ht, l.total_ttc]
      );
    }

    // Historique initial
    await client.query(
      `INSERT INTO commande_historique (commande_id, statut, commentaire, created_by)
       VALUES ($1, 'brouillon', 'Commande créée', $2)`,
      [cmd.id, userId]
    );

    // Déduire le stock si vente
    if (type === 'vente') {
      for (const l of lignesCalculees) {
        const p = produitsMap[l.produit_id];
        const stockApres = p.stock_actuel - l.quantite;
        await client.query(
          `INSERT INTO stock_mouvements
             (produit_id, type, quantite, stock_avant, stock_apres, commande_id, created_by)
           VALUES ($1, 'sortie_vente', $2, $3, $4, $5, $6)`,
          [l.produit_id, -l.quantite, p.stock_actuel, stockApres, cmd.id, userId]
        );
      }
    }

    return cmd;
  });
};

// ── UPDATE ────────────────────────────────────────────────────
const update = async (id, data, userId) => {
  const { rows: [existing] } = await query('SELECT statut FROM commandes WHERE id=$1', [id]);
  if (!existing) { const e = new Error('Commande introuvable'); e.statusCode = 404; throw e; }
  if (existing.statut !== 'brouillon') {
    const e = new Error('Seules les commandes en brouillon peuvent être modifiées');
    e.statusCode = 409; throw e;
  }

  return withTransaction(async (client) => {
    const {
      client_id, lignes, remise_pct = 0, frais_livraison = 0,
      paiement_mode, notes, notes_internes, adresse_livraison,
    } = data;

    // Récupérer infos produits
    const produitsIds = [...new Set(lignes.map((l) => l.produit_id))];
    const { rows: produits } = await client.query(
      `SELECT id, nom, reference, prix_vente_ht, tva_taux FROM produits WHERE id = ANY($1)`,
      [produitsIds]
    );
    const produitsMap = Object.fromEntries(produits.map((p) => [p.id, p]));

    const lignesEnrichies = lignes.map((l) => {
      const p = produitsMap[l.produit_id];
      return {
        ...l,
        produit_nom:      p?.nom || '',
        produit_ref:      p?.reference || '',
        tva_taux:         l.tva_taux ?? p?.tva_taux ?? 20,
        prix_unitaire_ht: l.prix_unitaire_ht ?? p?.prix_vente_ht ?? 0,
      };
    });

    const { lignesCalculees, sous_total_ht, remise_montant, total_ht, total_tva, total_ttc } =
      calculerTotaux(lignesEnrichies, remise_pct, frais_livraison);

    // Supprimer anciennes lignes
    await client.query('DELETE FROM commande_lignes WHERE commande_id = $1', [id]);

    // Remettre les nouvelles
    for (const l of lignesCalculees) {
      await client.query(
        `INSERT INTO commande_lignes
           (commande_id, produit_id, produit_nom, produit_ref,
            quantite, prix_unitaire_ht, tva_taux, remise_pct, total_ht, total_ttc)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [id, l.produit_id, l.produit_nom, l.produit_ref,
         l.quantite, l.prix_unitaire_ht, l.tva_taux,
         l.remise_pct || 0, l.total_ht, l.total_ttc]
      );
    }

    const { rows: [cmd] } = await client.query(
      `UPDATE commandes SET
         client_id=$1, sous_total_ht=$2, remise_pct=$3, remise_montant=$4,
         total_ht=$5, total_tva=$6, frais_livraison=$7, total_ttc=$8,
         paiement_mode=$9, notes=$10, notes_internes=$11, adresse_livraison=$12
       WHERE id=$13 RETURNING *`,
      [client_id || null, sous_total_ht, remise_pct, remise_montant,
       total_ht, total_tva, frais_livraison, total_ttc,
       paiement_mode || null, notes || null, notes_internes || null,
       adresse_livraison || null, id]
    );

    return cmd;
  });
};

// ── TRANSITION DE STATUT ──────────────────────────────────────
const updateStatut = async (id, newStatut, commentaire, userId) => {
  const { rows: [cmd] } = await query('SELECT * FROM commandes WHERE id=$1', [id]);
  if (!cmd) { const e = new Error('Commande introuvable'); e.statusCode = 404; throw e; }

  if (!canTransition(cmd.statut, newStatut)) {
    const e = new Error(
      `Transition impossible : ${cmd.statut} → ${newStatut}. ` +
      `Transitions valides : ${TRANSITIONS[cmd.statut]?.join(', ') || 'aucune'}`
    );
    e.statusCode = 409; throw e;
  }

  return withTransaction(async (client) => {
    // Champs timestamps selon statut
    const tsField = {
      confirmee:      'confirmed_at',
      expediee:       'shipped_at',
      livree:         'delivered_at',
    }[newStatut];

    const { rows: [updated] } = await client.query(
      `UPDATE commandes SET statut=$1 ${tsField ? `, ${tsField}=NOW()` : ''}
       WHERE id=$2 RETURNING *`,
      [newStatut, id]
    );

    // Remettre le stock si annulation d'une vente déjà confirmée
    if (newStatut === 'annulee' && cmd.type === 'vente' && cmd.statut !== 'brouillon') {
      const { rows: lignes } = await client.query(
        'SELECT * FROM commande_lignes WHERE commande_id=$1', [id]
      );
      for (const l of lignes) {
        const { rows: [p] } = await client.query(
          'SELECT stock_actuel FROM produits WHERE id=$1', [l.produit_id]
        );
        if (p) {
          await client.query(
            `INSERT INTO stock_mouvements
               (produit_id, type, quantite, stock_avant, stock_apres, commande_id, motif, created_by)
             VALUES ($1, 'entree_retour', $2, $3, $4, $5, 'Annulation commande', $6)`,
            [l.produit_id, l.quantite, p.stock_actuel, p.stock_actuel + l.quantite, id, userId]
          );
        }
      }
    }

    // Historique
    await client.query(
      `INSERT INTO commande_historique (commande_id, statut, commentaire, created_by)
       VALUES ($1, $2, $3, $4)`,
      [id, newStatut, commentaire || null, userId]
    );

    return updated;
  });
};

// ── ENREGISTRER PAIEMENT ──────────────────────────────────────
const enregistrerPaiement = async (id, montant, mode) => {
  const { rows: [cmd] } = await query('SELECT * FROM commandes WHERE id=$1', [id]);
  if (!cmd) { const e = new Error('Commande introuvable'); e.statusCode = 404; throw e; }

  const nouveauMontantPaye = parseFloat(cmd.montant_paye) + parseFloat(montant);
  let paiementStatut = 'partiel';
  if (nouveauMontantPaye >= parseFloat(cmd.total_ttc)) paiementStatut = 'paye';

  const { rows: [updated] } = await query(
    `UPDATE commandes
     SET montant_paye=$1, paiement_statut=$2, paiement_mode=$3
     WHERE id=$4 RETURNING *`,
    [nouveauMontantPaye, paiementStatut, mode, id]
  );
  return updated;
};

// ── ANNULER ───────────────────────────────────────────────────
const annuler = async (id, userId) => {
  return updateStatut(id, 'annulee', 'Annulation manuelle', userId);
};

// ── STATS ─────────────────────────────────────────────────────
const getStats = async () => {
  const { rows } = await query(`
    SELECT
      statut,
      COUNT(*)            AS nb,
      SUM(total_ttc)      AS ca_total
    FROM commandes
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY statut
    ORDER BY nb DESC
  `);
  return rows;
};

module.exports = {
  getAll, getOne, create, update,
  updateStatut, enregistrerPaiement, annuler, getStats,
};