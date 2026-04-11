const router = require('express').Router();
const { body, param } = require('express-validator');
const bcrypt   = require('bcryptjs');
const { query } = require('../../config/db');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate  = require('../../middlewares/validate');

router.use(authenticate);
router.use(authorize('admin'));

// ── GET /api/admin/users ──────────────────────────────────────
router.get('/users', async (req, res) => {
  const { search, role, statut, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const conds  = ['1=1']; const params = []; let i = 1;
 
  if (search) {
    conds.push(`(nom ILIKE $${i} OR prenom ILIKE $${i} OR email ILIKE $${i})`);
    params.push(`%${search}%`); i++;
  }
  if (role)   { conds.push(`role = $${i}`);   params.push(role);   i++; }
  if (statut) { conds.push(`statut = $${i}`); params.push(statut); i++; }
 
  const where = conds.join(' AND ');
  const { rows: data } = await query(
    `SELECT id, nom, prenom, email, role, statut, derniere_connexion, created_at
     FROM users WHERE ${where}
     ORDER BY created_at DESC LIMIT $${i} OFFSET $${i+1}`,
    [...params, limit, offset]
  );
  const { rows: cnt } = await query(
    `SELECT COUNT(*) FROM users WHERE ${where}`, params
  );
  res.json({ success:true, data, total:parseInt(cnt[0].count), page:+page, limit:+limit });
});

// ── GET /api/admin/users/:id ──────────────────────────────────
router.get('/users/:id', param('id').isUUID(), validate, async (req, res) => {
  const { rows } = await query(
    'SELECT id,nom,prenom,email,role,statut,avatar_url,derniere_connexion,created_at FROM users WHERE id=$1',
    [req.params.id]
  );
  if (!rows[0]) { const e = new Error('Utilisateur introuvable'); e.statusCode=404; throw e; }
  res.json({ success:true, data:rows[0] });
});

// ── POST /api/admin/users ─────────────────────────────────────
router.post('/users', authorize('superadmin'), [
  body('nom').trim().notEmpty().withMessage('Nom requis'),
  body('prenom').trim().notEmpty().withMessage('Prénom requis'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').isLength({ min:8 }).withMessage('Mot de passe : 8 caractères minimum'),
  body('role').isIn(['admin','manager','vendeur','lecteur']).withMessage('Rôle invalide'),
], validate, async (req, res) => {
  const { nom, prenom, email, password, role } = req.body;
 
  const exists = await query('SELECT id FROM users WHERE email=$1', [email]);
  if (exists.rows.length > 0) {
    return res.status(409).json({ success:false, message:'Email déjà utilisé' });
  }
 
  const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS)||12);
  const { rows } = await query(
    `INSERT INTO users (nom,prenom,email,password_hash,role)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id,nom,prenom,email,role,statut,created_at`,
    [nom, prenom, email, hash, role]
  );
  res.status(201).json({ success:true, message:'Utilisateur créé', data:rows[0] });
});

// ── PUT /api/admin/users/:id ──────────────────────────────────
router.put('/users/:id', [
  param('id').isUUID(),
  body('nom').trim().notEmpty(),
  body('prenom').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('role').isIn(['admin','manager','vendeur','lecteur']),
  body('statut').isIn(['actif','inactif','suspendu']),
], validate, async (req, res) => {
  const { id } = req.params;
  const { nom, prenom, email, role, statut } = req.body;
 
  // Empêcher de modifier un superadmin si on n'est pas superadmin
  const { rows:[target] } = await query('SELECT role FROM users WHERE id=$1',[id]);
  if (!target) { const e=new Error('Introuvable'); e.statusCode=404; throw e; }
  if (target.role==='superadmin' && req.user.role!=='superadmin') {
    return res.status(403).json({ success:false, message:'Seul un superadmin peut modifier un superadmin' });
  }
  // Empêcher de s'auto-modifier son rôle vers superadmin
  if (id===req.user.id && role==='superadmin' && req.user.role!=='superadmin') {
    return res.status(403).json({ success:false, message:'Auto-promotion interdite' });
  }
 
  const { rows } = await query(
    `UPDATE users SET nom=$1,prenom=$2,email=$3,role=$4,statut=$5
     WHERE id=$6 RETURNING id,nom,prenom,email,role,statut`,
    [nom, prenom, email, role, statut, id]
  );
  res.json({ success:true, message:'Utilisateur mis à jour', data:rows[0] });
});

// ── PATCH /api/admin/users/:id/password ───────────────────────
router.patch('/users/:id/password', authorize('superadmin'), [
  param('id').isUUID(),
  body('password').isLength({ min:8 }).withMessage('8 caractères minimum'),
], validate, async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, parseInt(process.env.BCRYPT_ROUNDS)||12);
  await query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.params.id]);
  await query('DELETE FROM refresh_tokens WHERE user_id=$1', [req.params.id]);
  res.json({ success:true, message:'Mot de passe réinitialisé — sessions révoquées' });
});

// ── PATCH /api/admin/users/:id/statut ────────────────────────
router.patch('/users/:id/statut', [
  param('id').isUUID(),
  body('statut').isIn(['actif','inactif','suspendu']),
], validate, async (req, res) => {
  const { rows } = await query(
    'UPDATE users SET statut=$1 WHERE id=$2 RETURNING id,nom,prenom,statut',
    [req.body.statut, req.params.id]
  );
  if (!rows[0]) { const e=new Error('Introuvable'); e.statusCode=404; throw e; }
  // Révoquer les sessions si suspendu
  if (req.body.statut !== 'actif') {
    await query('DELETE FROM refresh_tokens WHERE user_id=$1', [req.params.id]);
  }
  res.json({ success:true, message:`Statut → ${req.body.statut}`, data:rows[0] });
});

// ── DELETE /api/admin/users/:id ───────────────────────────────
router.delete('/users/:id', authorize('superadmin'), param('id').isUUID(), validate, async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ success:false, message:'Impossible de supprimer son propre compte' });
  }
  await query('DELETE FROM refresh_tokens WHERE user_id=$1', [req.params.id]);
  await query('DELETE FROM users WHERE id=$1', [req.params.id]);
  res.json({ success:true, message:'Utilisateur supprimé' });
});

// ── GET /api/admin/stats ──────────────────────────────────────
router.get('/stats', authorize('superadmin'), async (req, res) => {
  const [users, activite, config] = await Promise.all([
    query(`
      SELECT
        COUNT(*)                                          AS total,
        COUNT(*) FILTER (WHERE statut='actif')            AS actifs,
        COUNT(*) FILTER (WHERE statut='suspendu')         AS suspendus,
        COUNT(*) FILTER (WHERE role='superadmin')         AS superadmins,
        COUNT(*) FILTER (WHERE role='admin')              AS admins,
        COUNT(*) FILTER (WHERE role='manager')            AS managers,
        COUNT(*) FILTER (WHERE role='vendeur')            AS vendeurs,
        COUNT(*) FILTER (WHERE role='lecteur')            AS lecteurs,
        COUNT(*) FILTER (WHERE derniere_connexion > NOW()-INTERVAL '7 days') AS actifs_7j
      FROM users
    `),
    query(`
      SELECT
        (SELECT COUNT(*) FROM commandes WHERE created_at > NOW()-INTERVAL '30 days') AS cmds_30j,
        (SELECT COUNT(*) FROM produits)  AS nb_produits,
        (SELECT COUNT(*) FROM clients)   AS nb_clients,
        (SELECT COUNT(*) FROM stock_mouvements WHERE created_at > NOW()-INTERVAL '30 days') AS mvts_30j
    `),
    query('SELECT cle, valeur FROM config_boutique ORDER BY cle'),
  ]);
 
  res.json({
    success: true,
    data: {
      users:    users.rows[0],
      activite: activite.rows[0],
      config:   config.rows,
    },
  });
});

// ── PUT /api/admin/config ─────────────────────────────────────
router.put('/config', authorize('superadmin'), async (req, res) => {
  const updates = req.body; // { cle: valeur, ... }
  for (const [cle, valeur] of Object.entries(updates)) {
    await query(
      `UPDATE config_boutique SET valeur=$1, updated_by=$2 WHERE cle=$3`,
      [valeur, req.user.id, cle]
    );
  }
  res.json({ success:true, message:'Configuration sauvegardée' });
});
 
module.exports = router;