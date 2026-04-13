const { query } = require('../../config/db');

const getAll = async ({ search, categorie_id, marque_id, statut, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  const conditions = ['1=1'];
  const params = [];
  let i = 1;

  if (search) {
    conditions.push(`(p.nom ILIKE $${i} OR p.reference ILIKE $${i} OR p.code_barre ILIKE $${i})`);
    params.push(`%${search}%`); i++;
  }
  if (categorie_id) { conditions.push(`p.categorie_id = $${i}`); params.push(categorie_id); i++; }
  if (marque_id)    { conditions.push(`p.marque_id = $${i}`);    params.push(marque_id);    i++; }
  if (statut)       { conditions.push(`p.statut = $${i}`);       params.push(statut);       i++; }

  const where = conditions.join(' AND ');

  const { rows: data } = await query(
    `SELECT p.*, m.nom AS marque_nom, c.nom AS categorie_nom,
            CASE WHEN p.stock_actuel <= 0 THEN 'rupture'
                 WHEN p.stock_actuel <= p.stock_minimum THEN 'alerte'
                 ELSE 'ok' END AS etat_stock
     FROM produits p
     LEFT JOIN marques m    ON m.id = p.marque_id
     LEFT JOIN categories c ON c.id = p.categorie_id
     WHERE ${where}
     ORDER BY p.created_at DESC
     LIMIT $${i} OFFSET $${i+1}`,
    [...params, limit, offset]
  );

  const { rows: count } = await query(
    `SELECT COUNT(*) FROM produits p WHERE ${where}`, params
  );

  return { data, total: parseInt(count[0].count), page: +page, limit: +limit };
};

const getOne = async (id) => {
  const { rows } = await query(
    `SELECT p.*, m.nom AS marque_nom, c.nom AS categorie_nom, f.raison_sociale AS fournisseur_nom
     FROM produits p
     LEFT JOIN marques m      ON m.id = p.marque_id
     LEFT JOIN categories c   ON c.id = p.categorie_id
     LEFT JOIN fournisseurs f  ON f.id = p.fournisseur_id
     WHERE p.id = $1`, [id]
  );
  if (!rows[0]) { const e = new Error('Produit introuvable'); e.statusCode = 404; throw e; }
  return rows[0];
};

const create = async (data, userId) => {
  const { reference, code_barre, nom, description, marque_id, categorie_id, fournisseur_id,
          prix_achat_ht, prix_vente_ht, tva_taux = 20, stock_minimum = 5, stock_maximum,
          poids_kg, dimensions, images = [], attributs = {}, statut = 'actif' } = data;

  const { rows } = await query(
    `INSERT INTO produits
       (reference, code_barre, nom, description, marque_id, categorie_id, fournisseur_id,
        prix_achat_ht, prix_vente_ht, tva_taux, stock_minimum, stock_maximum,
        poids_kg, dimensions, images, attributs, statut, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     RETURNING *`,
    [reference, code_barre || null, nom, description || null, marque_id || null,
     categorie_id || null, fournisseur_id || null, prix_achat_ht, prix_vente_ht,
     tva_taux, stock_minimum, stock_maximum || null, poids_kg || null, dimensions || null,
     JSON.stringify(images), JSON.stringify(attributs), statut, userId]
  );
  return rows[0];
};

const update = async (id, data) => {
  const { reference, code_barre, nom, description, marque_id, categorie_id, fournisseur_id,
          prix_achat_ht, prix_vente_ht, tva_taux, stock_minimum, stock_maximum,
          poids_kg, dimensions, images, attributs, statut } = data;

  const { rows } = await query(
    `UPDATE produits SET
       reference=$1, code_barre=$2, nom=$3, description=$4,
       marque_id=$5, categorie_id=$6, fournisseur_id=$7,
       prix_achat_ht=$8, prix_vente_ht=$9, tva_taux=$10,
       stock_minimum=$11, stock_maximum=$12, poids_kg=$13,
       dimensions=$14, images=$15, attributs=$16, statut=$17
     WHERE id=$18 RETURNING *`,
    [reference, code_barre || null, nom, description || null,
     marque_id || null, categorie_id || null, fournisseur_id || null,
     prix_achat_ht, prix_vente_ht, tva_taux, stock_minimum,
     stock_maximum || null, poids_kg || null, dimensions || null,
     JSON.stringify(images || []), JSON.stringify(attributs || {}), statut, id]
  );
  if (!rows[0]) { const e = new Error('Produit introuvable'); e.statusCode = 404; throw e; }
  return rows[0];
};

const updateStatut = async (id, statut) => {
  const { rows } = await query(
    'UPDATE produits SET statut=$1 WHERE id=$2 RETURNING id, statut', [statut, id]
  );
  if (!rows[0]) { const e = new Error('Produit introuvable'); e.statusCode = 404; throw e; }
  return rows[0];
};

const remove = async (id, userId, motif) => {
  const { rows } = await query(
    `UPDATE produits SET deleted_at=NOW(), deleted_by=$2, delete_motif=$3, statut='discontinue'
     WHERE id=$1 AND deleted_at IS NULL RETURNING id, nom`,
    [id, userId || null, motif || null]
  );
  if (!rows[0]) { const e = new Error('Produit introuvable ou déjà archivé'); e.statusCode = 404; throw e; }
  return rows[0];
};

const restore = async (id) => {
  const { rows } = await query(
    `UPDATE produits SET deleted_at=NULL, deleted_by=NULL, delete_motif=NULL, statut='actif'
     WHERE id=$1 AND deleted_at IS NOT NULL RETURNING id, nom, statut`,
    [id]
  );
  if (!rows[0]) { const e = new Error('Produit introuvable ou non archivé'); e.statusCode = 404; throw e; }
  return rows[0];
};

const getArchives = async ({ search, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  const conds = ['p.deleted_at IS NOT NULL']; const params = []; let i = 1;
  if (search) { conds.push(`(p.nom ILIKE $${i} OR p.reference ILIKE $${i})`); params.push(`%${search}%`); i++; }
  const where = conds.join(' AND ');
  const { rows: data } = await query(
    `SELECT p.*, u.prenom || ' ' || u.nom AS supprime_par_nom
     FROM produits p LEFT JOIN users u ON u.id = p.deleted_by
     WHERE ${where} ORDER BY p.deleted_at DESC LIMIT $${i} OFFSET $${i+1}`,
    [...params, limit, offset]
  );
  const { rows: cnt } = await query(`SELECT COUNT(*) FROM produits p WHERE ${where}`, params);
  return { data, total: parseInt(cnt[0].count), page: +page, limit: +limit };
};

const getAlertes = async () => {
  const { rows } = await query(
    `SELECT id, reference, nom, stock_actuel, stock_minimum,
            CASE WHEN stock_actuel <= 0 THEN 'rupture' ELSE 'alerte' END AS etat_stock
     FROM produits
     WHERE statut = 'actif' AND stock_actuel <= stock_minimum
     ORDER BY stock_actuel ASC`
  );
  return rows;
};

module.exports = { getAll, getOne, create, update, updateStatut, remove, restore, getArchives, getAlertes };