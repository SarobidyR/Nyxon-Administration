const { query, withTransaction } = require('../../config/db');

const getAll = async ({ statut, plateforme, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  const conds  = ['1=1']; const params = []; let i = 1;
  if (statut)     { conds.push(`statut = $${i}`);     params.push(statut);     i++; }
  if (plateforme) { conds.push(`plateforme = $${i}`); params.push(plateforme); i++; }
  const where = conds.join(' AND ');
  const { rows: data } = await query(
    `SELECT *, ROUND((depense_actuelle / NULLIF(budget_total,0)) * 100, 1) AS pct_depense
     FROM ads_campagnes WHERE ${where}
     ORDER BY created_at DESC LIMIT $${i} OFFSET $${i+1}`,
    [...params, limit, offset]
  );
  const { rows: cnt } = await query(`SELECT COUNT(*) FROM ads_campagnes WHERE ${where}`, params);
  return { data, total: parseInt(cnt[0].count), page: +page, limit: +limit };
};

const getOne = async (id) => {
  const { rows } = await query('SELECT * FROM ads_campagnes WHERE id=$1', [id]);
  if (!rows[0]) { const e = new Error('Campagne introuvable'); e.statusCode = 404; throw e; }
  return rows[0];
};

const create = async (data, userId) => {
  const {
    nom, plateforme, objectif, statut = 'planifiee',
    budget_total, budget_journalier, date_debut, date_fin, notes,
  } = data;
  const { rows } = await query(
    `INSERT INTO ads_campagnes
       (nom, plateforme, objectif, statut, budget_total, budget_journalier,
        date_debut, date_fin, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [nom, plateforme, objectif, statut, budget_total,
     budget_journalier || null, date_debut, date_fin || null, notes || null, userId]
  );
  return rows[0];
};

const update = async (id, data) => {
  const {
    nom, plateforme, objectif, statut, budget_total,
    budget_journalier, date_debut, date_fin, notes,
  } = data;
  const { rows } = await query(
    `UPDATE ads_campagnes SET
       nom=$1, plateforme=$2, objectif=$3, statut=$4, budget_total=$5,
       budget_journalier=$6, date_debut=$7, date_fin=$8, notes=$9
     WHERE id=$10 RETURNING *`,
    [nom, plateforme, objectif, statut, budget_total,
     budget_journalier || null, date_debut, date_fin || null, notes || null, id]
  );
  if (!rows[0]) { const e = new Error('Campagne introuvable'); e.statusCode = 404; throw e; }
  return rows[0];
};

const updateStatut = async (id, statut) => {
  const { rows } = await query(
    'UPDATE ads_campagnes SET statut=$1 WHERE id=$2 RETURNING id, nom, statut',
    [statut, id]
  );
  if (!rows[0]) { const e = new Error('Campagne introuvable'); e.statusCode = 404; throw e; }
  return rows[0];
};

const ajouterDepense = async (campagneId, { date, depense, impressions = 0, clics = 0, conversions = 0, revenus = 0 }) => {
  return withTransaction(async (client) => {
    // Upsert dépense quotidienne
    const { rows: [dep] } = await client.query(
      `INSERT INTO ads_depenses_quotidiennes
         (campagne_id, date, depense, impressions, clics, conversions, revenus)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (campagne_id, date) DO UPDATE SET
         depense=$3, impressions=$4, clics=$5, conversions=$6, revenus=$7
       RETURNING *`,
      [campagneId, date, depense, impressions, clics, conversions, revenus]
    );

    // Recalculer totaux de la campagne
    await client.query(`
      UPDATE ads_campagnes SET
        depense_actuelle = (SELECT COALESCE(SUM(depense),0)     FROM ads_depenses_quotidiennes WHERE campagne_id=$1),
        impressions      = (SELECT COALESCE(SUM(impressions),0) FROM ads_depenses_quotidiennes WHERE campagne_id=$1),
        clics            = (SELECT COALESCE(SUM(clics),0)       FROM ads_depenses_quotidiennes WHERE campagne_id=$1),
        conversions      = (SELECT COALESCE(SUM(conversions),0) FROM ads_depenses_quotidiennes WHERE campagne_id=$1),
        revenus_generes  = (SELECT COALESCE(SUM(revenus),0)     FROM ads_depenses_quotidiennes WHERE campagne_id=$1)
      WHERE id=$1
    `, [campagneId]);

    return dep;
  });
};

const getDepenses = async (campagneId, { page = 1, limit = 30 } = {}) => {
  const offset = (page - 1) * limit;
  const { rows: data } = await query(
    `SELECT *,
            CASE WHEN clics > 0 THEN ROUND(depense::NUMERIC / clics, 4) ELSE 0 END AS cpc,
            CASE WHEN depense > 0 THEN ROUND(revenus::NUMERIC / depense, 4) ELSE 0 END AS roas
     FROM ads_depenses_quotidiennes
     WHERE campagne_id=$1 ORDER BY date DESC LIMIT $2 OFFSET $3`,
    [campagneId, limit, offset]
  );
  const { rows: cnt } = await query(
    'SELECT COUNT(*) FROM ads_depenses_quotidiennes WHERE campagne_id=$1', [campagneId]
  );
  return { data, total: parseInt(cnt[0].count), page: +page, limit: +limit };
};

const remove = async (id) => {
  await query('DELETE FROM ads_campagnes WHERE id=$1', [id]);
};

const getResume = async () => {
  const { rows: [global] } = await query(`
    SELECT
      COUNT(*)                                               AS nb_campagnes,
      COUNT(*) FILTER (WHERE statut = 'active')              AS nb_actives,
      COALESCE(SUM(budget_total), 0)                         AS budget_total,
      COALESCE(SUM(depense_actuelle), 0)                     AS depense_totale,
      COALESCE(SUM(revenus_generes), 0)                      AS revenus_totaux,
      CASE WHEN SUM(depense_actuelle) > 0
           THEN ROUND(SUM(revenus_generes)::NUMERIC / SUM(depense_actuelle), 2)
           ELSE 0 END                                        AS roas_global,
      COALESCE(SUM(impressions), 0)                          AS impressions_totales,
      COALESCE(SUM(clics), 0)                                AS clics_totaux,
      CASE WHEN SUM(clics) > 0
           THEN ROUND(SUM(depense_actuelle)::NUMERIC / SUM(clics), 4)
           ELSE 0 END                                        AS cpc_moyen
    FROM ads_campagnes
  `);

  const { rows: parPlateforme } = await query(`
    SELECT plateforme,
           COUNT(*) AS nb, SUM(budget_total) AS budget, SUM(depense_actuelle) AS depense,
           SUM(revenus_generes) AS revenus, SUM(clics) AS clics,
           CASE WHEN SUM(depense_actuelle) > 0
                THEN ROUND(SUM(revenus_generes)::NUMERIC / SUM(depense_actuelle), 2)
                ELSE 0 END AS roas
    FROM ads_campagnes GROUP BY plateforme ORDER BY depense DESC
  `);

  const { rows: actives } = await query(
    `SELECT * FROM ads_campagnes WHERE statut='active' ORDER BY date_fin ASC LIMIT 5`
  );

  return { global: global || {}, parPlateforme, actives };
};

module.exports = { getAll, getOne, create, update, updateStatut, ajouterDepense, getDepenses, remove, getResume };