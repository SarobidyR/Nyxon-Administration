const { query } = require('../../config/db');

// ── Générer un slug unique depuis le nom ──────────────────────
const genSlug = async (nom, excludeId = null) => {
  let base = nom
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // retirer accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  let slug = base; let n = 1;
  while (true) {
    const q = excludeId
      ? await query('SELECT id FROM categories WHERE slug=$1 AND id!=$2', [slug, excludeId])
      : await query('SELECT id FROM categories WHERE slug=$1', [slug]);
    if (q.rows.length === 0) break;
    slug = `${base}-${n++}`;
  }
  return slug;
};

// ── Liste à plat ──────────────────────────────────────────────
const getAll = async ({ search, parent_id, actif, page = 1, limit = 50 }) => {
  const offset = (page - 1) * limit;
  const conds  = ['1=1']; const params = []; let i = 1;

  if (search) {
    conds.push(`c.nom ILIKE $${i}`);
    params.push(`%${search}%`); i++;
  }
  if (parent_id === 'null' || parent_id === '') {
    conds.push('c.parent_id IS NULL');
  } else if (parent_id) {
    conds.push(`c.parent_id = $${i}`); params.push(parent_id); i++;
  }
  if (actif !== undefined) {
    conds.push(`c.actif = $${i}`);
    params.push(actif === 'true' || actif === true); i++;
  }

  const where = conds.join(' AND ');

  const { rows: data } = await query(
    `SELECT c.*,
            p.nom       AS parent_nom,
            COUNT(pr.id) AS nb_produits
     FROM categories c
     LEFT JOIN categories p  ON p.id = c.parent_id
     LEFT JOIN produits pr   ON pr.categorie_id = c.id AND pr.statut != 'discontinue'
     WHERE ${where}
     GROUP BY c.id, p.nom
     ORDER BY c.ordre ASC, c.nom ASC
     LIMIT $${i} OFFSET $${i + 1}`,
    [...params, limit, offset]
  );

  const { rows: cnt } = await query(
    `SELECT COUNT(*) FROM categories c WHERE ${where}`, params
  );

  return { data, total: parseInt(cnt[0].count), page: +page, limit: +limit };
};

// ── Arbre hiérarchique complet ────────────────────────────────
const getTree = async () => {
  const { rows } = await query(
    `SELECT c.id, c.parent_id, c.nom, c.slug, c.ordre, c.actif,
            COUNT(p.id) AS nb_produits
     FROM categories c
     LEFT JOIN produits p ON p.categorie_id = c.id AND p.statut = 'actif'
     GROUP BY c.id
     ORDER BY c.ordre ASC, c.nom ASC`
  );

  // Construire l'arbre en mémoire
  const map = {};
  rows.forEach(r => { map[r.id] = { ...r, enfants: [] }; });

  const tree = [];
  rows.forEach(r => {
    if (r.parent_id && map[r.parent_id]) {
      map[r.parent_id].enfants.push(map[r.id]);
    } else {
      tree.push(map[r.id]);
    }
  });
  return tree;
};

// ── Détail ────────────────────────────────────────────────────
const getOne = async (id) => {
  const { rows } = await query(
    `SELECT c.*, p.nom AS parent_nom,
            COUNT(pr.id) AS nb_produits
     FROM categories c
     LEFT JOIN categories p ON p.id = c.parent_id
     LEFT JOIN produits pr  ON pr.categorie_id = c.id
     WHERE c.id = $1
     GROUP BY c.id, p.nom`,
    [id]
  );
  if (!rows[0]) {
    const e = new Error('Catégorie introuvable'); e.statusCode = 404; throw e;
  }
  return rows[0];
};

// ── Créer ─────────────────────────────────────────────────────
const create = async ({ nom, slug, description, parent_id, ordre = 0 }) => {
  // Vérifier que le parent existe si fourni
  if (parent_id) {
    const p = await query('SELECT id FROM categories WHERE id=$1', [parent_id]);
    if (p.rows.length === 0) {
      const e = new Error('Catégorie parente introuvable'); e.statusCode = 404; throw e;
    }
  }

  const finalSlug = slug || await genSlug(nom);

  const { rows } = await query(
    `INSERT INTO categories (nom, slug, description, parent_id, ordre)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [nom, finalSlug, description || null, parent_id || null, ordre]
  );
  return rows[0];
};

// ── Mettre à jour ─────────────────────────────────────────────
const update = async (id, { nom, slug, description, parent_id, ordre, actif }) => {
  // Interdire qu'une catégorie soit son propre parent
  if (parent_id && parent_id === id) {
    const e = new Error('Une catégorie ne peut pas être son propre parent');
    e.statusCode = 400; throw e;
  }

  // Interdire les cycles : vérifier que id n'est pas ancêtre de parent_id
  if (parent_id) {
    const { rows: anc } = await query(
      `WITH RECURSIVE ancestors AS (
         SELECT id, parent_id FROM categories WHERE id = $1
         UNION ALL
         SELECT c.id, c.parent_id FROM categories c
         JOIN ancestors a ON c.id = a.parent_id
       )
       SELECT id FROM ancestors WHERE id = $2`,
      [parent_id, id]
    );
    if (anc.length > 0) {
      const e = new Error('Référence circulaire détectée dans la hiérarchie');
      e.statusCode = 400; throw e;
    }
  }

  const finalSlug = slug || await genSlug(nom, id);

  const { rows } = await query(
    `UPDATE categories
     SET nom=$1, slug=$2, description=$3, parent_id=$4, ordre=$5, actif=$6
     WHERE id=$7 RETURNING *`,
    [nom, finalSlug, description || null, parent_id || null,
     ordre !== undefined ? ordre : 0,
     actif !== undefined ? actif : true, id]
  );
  if (!rows[0]) {
    const e = new Error('Catégorie introuvable'); e.statusCode = 404; throw e;
  }
  return rows[0];
};

// ── Mettre à jour l'ordre seulement ──────────────────────────
const updateOrdre = async (id, ordre) => {
  const { rows } = await query(
    'UPDATE categories SET ordre=$1 WHERE id=$2 RETURNING id, nom, ordre',
    [ordre, id]
  );
  if (!rows[0]) {
    const e = new Error('Catégorie introuvable'); e.statusCode = 404; throw e;
  }
  return rows[0];
};

// ── Supprimer ─────────────────────────────────────────────────
const remove = async (id) => {
  // Vérifier s'il y a des sous-catégories
  const { rows: enfants } = await query(
    'SELECT COUNT(*) FROM categories WHERE parent_id = $1', [id]
  );
  if (parseInt(enfants[0].count) > 0) {
    const e = new Error('Impossible de supprimer : des sous-catégories existent');
    e.statusCode = 409; throw e;
  }

  // Vérifier s'il y a des produits liés
  const { rows: produits } = await query(
    'SELECT COUNT(*) FROM produits WHERE categorie_id = $1', [id]
  );
  if (parseInt(produits[0].count) > 0) {
    // Soft delete
    await query('UPDATE categories SET actif = false WHERE id = $1', [id]);
    return { soft: true };
  }

  await query('DELETE FROM categories WHERE id = $1', [id]);
  return { soft: false };
};

module.exports = { getAll, getTree, getOne, create, update, updateOrdre, remove };