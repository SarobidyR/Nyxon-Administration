const { query } = require('../../config/db');

// ── Liste avec comptage de produits associés ─────────────────
const getAll = async ({ search, actif, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  const conds  = ['1=1']; const params = []; let i = 1;

  if (search) {
    conds.push(`m.nom ILIKE $${i}`);
    params.push(`%${search}%`); i++;
  }
  if (actif !== undefined) {
    conds.push(`m.actif = $${i}`);
    params.push(actif === 'true' || actif === true); i++;
  }

  const where = conds.join(' AND ');

  const { rows: data } = await query(
    `SELECT m.*,
            COUNT(p.id) AS nb_produits
     FROM marques m
     LEFT JOIN produits p ON p.marque_id = m.id AND p.statut != 'discontinue'
     WHERE ${where}
     GROUP BY m.id
     ORDER BY m.nom ASC
     LIMIT $${i} OFFSET $${i + 1}`,
    [...params, limit, offset]
  );

  const { rows: cnt } = await query(
    `SELECT COUNT(*) FROM marques m WHERE ${where}`, params
  );

  return { data, total: parseInt(cnt[0].count), page: +page, limit: +limit };
};

// ── Détail d'une marque ───────────────────────────────────────
const getOne = async (id) => {
  const { rows } = await query(
    `SELECT m.*,
            COUNT(p.id) AS nb_produits
     FROM marques m
     LEFT JOIN produits p ON p.marque_id = m.id
     WHERE m.id = $1
     GROUP BY m.id`,
    [id]
  );
  if (!rows[0]) {
    const e = new Error('Marque introuvable'); e.statusCode = 404; throw e;
  }
  return rows[0];
};

// ── Créer ─────────────────────────────────────────────────────
const create = async ({ nom, description, logo_url, site_web }) => {
  // Vérifier unicité
  const exists = await query('SELECT id FROM marques WHERE nom ILIKE $1', [nom]);
  if (exists.rows.length > 0) {
    const e = new Error('Une marque avec ce nom existe déjà'); e.statusCode = 409; throw e;
  }

  const { rows } = await query(
    `INSERT INTO marques (nom, description, logo_url, site_web)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [nom, description || null, logo_url || null, site_web || null]
  );
  return rows[0];
};

// ── Mettre à jour ─────────────────────────────────────────────
const update = async (id, { nom, description, logo_url, site_web, actif }) => {
  // Vérifier unicité (hors soi-même)
  if (nom) {
    const exists = await query(
      'SELECT id FROM marques WHERE nom ILIKE $1 AND id != $2', [nom, id]
    );
    if (exists.rows.length > 0) {
      const e = new Error('Une marque avec ce nom existe déjà'); e.statusCode = 409; throw e;
    }
  }

  const { rows } = await query(
    `UPDATE marques
     SET nom=$1, description=$2, logo_url=$3, site_web=$4, actif=$5
     WHERE id=$6 RETURNING *`,
    [nom, description || null, logo_url || null, site_web || null,
     actif !== undefined ? actif : true, id]
  );
  if (!rows[0]) {
    const e = new Error('Marque introuvable'); e.statusCode = 404; throw e;
  }
  return rows[0];
};

// ── Activer / désactiver ──────────────────────────────────────
const toggleActif = async (id, actif) => {
  const { rows } = await query(
    'UPDATE marques SET actif=$1 WHERE id=$2 RETURNING id, nom, actif',
    [actif, id]
  );
  if (!rows[0]) {
    const e = new Error('Marque introuvable'); e.statusCode = 404; throw e;
  }
  return rows[0];
};

// ── Supprimer (soft via actif=false si produits liés, sinon hard) ──
const remove = async (id) => {
  const { rows: linked } = await query(
    'SELECT COUNT(*) FROM produits WHERE marque_id = $1', [id]
  );
  if (parseInt(linked[0].count) > 0) {
    // Des produits sont liés → désactiver seulement
    await query('UPDATE marques SET actif = false WHERE id = $1', [id]);
    return { soft: true };
  }
  await query('DELETE FROM marques WHERE id = $1', [id]);
  return { soft: false };
};

module.exports = { getAll, getOne, create, update, toggleActif, remove };