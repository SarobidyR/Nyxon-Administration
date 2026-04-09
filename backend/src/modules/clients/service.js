const { query } = require('../../config/db');

const getAll = async ({ search, type, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  const conds = ['1=1']; const params = []; let i = 1;
  if (search) {
    conds.push(`(nom ILIKE $${i} OR prenom ILIKE $${i} OR email ILIKE $${i} OR raison_sociale ILIKE $${i})`);
    params.push(`%${search}%`); i++;
  }
  if (type) { conds.push(`type = $${i}`); params.push(type); i++; }
  const where = conds.join(' AND ');
  const { rows: data }  = await query(`SELECT * FROM clients WHERE ${where} ORDER BY created_at DESC LIMIT $${i} OFFSET $${i+1}`, [...params, limit, offset]);
  const { rows: cnt }   = await query(`SELECT COUNT(*) FROM clients WHERE ${where}`, params);
  return { data, total: parseInt(cnt[0].count), page: +page, limit: +limit };
};

const getOne = async (id) => {
  const { rows } = await query('SELECT * FROM clients WHERE id = $1', [id]);
  if (!rows[0]) { const e = new Error('Client introuvable'); e.statusCode = 404; throw e; }
  return rows[0];
};

const create = async (data, userId) => {
  const { type = 'particulier', nom, prenom, raison_sociale, num_tva, siret,
          email, telephone, adresse, ville, code_postal, pays = 'Madagascar', notes, tags = [] } = data;
  const { rows } = await query(
    `INSERT INTO clients(type,nom,prenom,raison_sociale,num_tva,siret,email,telephone,
       adresse,ville,code_postal,pays,notes,tags,created_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
    [type, nom||null, prenom||null, raison_sociale||null, num_tva||null, siret||null,
     email||null, telephone||null, adresse||null, ville||null, code_postal||null, pays, notes||null, tags, userId]
  );
  return rows[0];
};

const update = async (id, data) => {
  const { type, nom, prenom, raison_sociale, num_tva, siret, email, telephone,
          adresse, ville, code_postal, pays, notes, tags, actif } = data;
  const { rows } = await query(
    `UPDATE clients SET type=$1,nom=$2,prenom=$3,raison_sociale=$4,num_tva=$5,siret=$6,
       email=$7,telephone=$8,adresse=$9,ville=$10,code_postal=$11,pays=$12,
       notes=$13,tags=$14,actif=$15 WHERE id=$16 RETURNING *`,
    [type, nom||null, prenom||null, raison_sociale||null, num_tva||null, siret||null,
     email||null, telephone||null, adresse||null, ville||null, code_postal||null,
     pays||'Madagascar', notes||null, tags||[], actif !== undefined ? actif : true, id]
  );
  if (!rows[0]) { const e = new Error('Client introuvable'); e.statusCode = 404; throw e; }
  return rows[0];
};

const remove = async (id) => {
  await query('UPDATE clients SET actif = false WHERE id = $1', [id]);
};

const getTop = async (limit = 10) => {
  const { rows } = await query(
    `SELECT id, nom, prenom, raison_sociale, email, telephone, nb_commandes, ca_total
     FROM clients WHERE actif = true ORDER BY ca_total DESC LIMIT $1`, [limit]
  );
  return rows;
};

module.exports = { getAll, getOne, create, update, remove, getTop };