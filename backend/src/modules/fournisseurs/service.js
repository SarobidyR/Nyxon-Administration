const { query } = require('../../config/db');

const getAll = async ({ search, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  const conds = ['1=1']; const params = []; let i = 1;
  if (search) {
    conds.push(`(raison_sociale ILIKE $${i} OR contact_nom ILIKE $${i} OR contact_email ILIKE $${i})`);
    params.push(`%${search}%`); i++;
  }
  const where = conds.join(' AND ');
  const { rows: data } = await query(`SELECT * FROM fournisseurs WHERE ${where} ORDER BY raison_sociale ASC LIMIT $${i} OFFSET $${i+1}`, [...params, limit, offset]);
  const { rows: cnt }  = await query(`SELECT COUNT(*) FROM fournisseurs WHERE ${where}`, params);
  return { data, total: parseInt(cnt[0].count), page: +page, limit: +limit };
};

const getOne = async (id) => {
  const { rows } = await query('SELECT * FROM fournisseurs WHERE id = $1', [id]);
  if (!rows[0]) { const e = new Error('Fournisseur introuvable'); e.statusCode = 404; throw e; }
  return rows[0];
};

const create = async (data) => {
  const { raison_sociale, contact_nom, contact_email, contact_tel, adresse, ville, pays = 'Madagascar',
          code_postal, num_tva, conditions_paiement, delai_livraison, note, notes } = data;
  const { rows } = await query(
    `INSERT INTO fournisseurs(raison_sociale,contact_nom,contact_email,contact_tel,adresse,ville,pays,
       code_postal,num_tva,conditions_paiement,delai_livraison,note,notes)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [raison_sociale, contact_nom||null, contact_email||null, contact_tel||null, adresse||null,
     ville||null, pays, code_postal||null, num_tva||null, conditions_paiement||null,
     delai_livraison||null, note||null, notes||null]
  );
  return rows[0];
};

const update = async (id, data) => {
  const { raison_sociale, contact_nom, contact_email, contact_tel, adresse, ville, pays,
          code_postal, num_tva, conditions_paiement, delai_livraison, note, notes, actif } = data;
  const { rows } = await query(
    `UPDATE fournisseurs SET raison_sociale=$1,contact_nom=$2,contact_email=$3,contact_tel=$4,
       adresse=$5,ville=$6,pays=$7,code_postal=$8,num_tva=$9,conditions_paiement=$10,
       delai_livraison=$11,note=$12,notes=$13,actif=$14 WHERE id=$15 RETURNING *`,
    [raison_sociale, contact_nom||null, contact_email||null, contact_tel||null, adresse||null,
     ville||null, pays||'Madagascar', code_postal||null, num_tva||null, conditions_paiement||null,
     delai_livraison||null, note||null, notes||null, actif !== undefined ? actif : true, id]
  );
  if (!rows[0]) { const e = new Error('Fournisseur introuvable'); e.statusCode = 404; throw e; }
  return rows[0];
};

const remove = async (id) => {
  await query('UPDATE fournisseurs SET actif = false WHERE id = $1', [id]);
};

module.exports = { getAll, getOne, create, update, remove };