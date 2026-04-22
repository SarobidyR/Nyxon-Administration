const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('./controller');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');

// POST /api/auth/register
router.post('/register', [
  body('nom').trim().notEmpty().withMessage('Nom requis'),
  body('prenom').trim().notEmpty().withMessage('Prénom requis'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 8 }).withMessage('Mot de passe : 8 caractères minimum'),
  body('role').optional().isIn(['admin','manager','vendeur','lecteur']).withMessage('Rôle invalide'),
  validate,
], ctrl.register);

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
  validate,
], ctrl.login);

// POST /api/auth/refresh
router.post('/refresh', ctrl.refresh);

// POST /api/auth/logout
router.post('/logout', authenticate, ctrl.logout);

// GET /api/auth/me
router.get('/me', authenticate, ctrl.me);

// PATCH /api/auth/change-password
router.patch('/change-password', authenticate, [
  body('ancienPassword').notEmpty().withMessage('Ancien mot de passe requis'),
  body('nouveauPassword').isLength({ min: 8 }).withMessage('Nouveau mot de passe : 8 caractères minimum'),
  validate,
], ctrl.changePassword);


// PATCH /api/auth/profile — chaque user peut modifier son propre profil
router.patch('/profile', authenticate, [
  body('nom').trim().notEmpty().withMessage('Nom requis'),
  body('prenom').trim().notEmpty().withMessage('Prénom requis'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  validate,
], async (req, res) => {
  const { query } = require('../../config/db');
  const { nom, prenom, email } = req.body;
  // Vérifier unicité email (hors soi-même)
  const existing = await query(
    'SELECT id FROM users WHERE email=$1 AND id!=$2', [email, req.user.id]
  );
  if (existing.rows.length > 0) {
    return res.status(409).json({ success:false, message:'Cet email est déjà utilisé' });
  }
  const { rows } = await query(
    'UPDATE users SET nom=$1, prenom=$2, email=$3 WHERE id=$4 RETURNING id,nom,prenom,email,role,statut',
    [nom, prenom, email, req.user.id]
  );
  res.json({ success:true, message:'Profil mis à jour', data:rows[0] });
});


// PATCH /api/auth/profile — modifier son propre profil (tous les rôles)
router.patch('/profile', authenticate, [
  body('nom').trim().notEmpty().withMessage('Nom requis'),
  body('prenom').trim().notEmpty().withMessage('Prénom requis'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  validate,
], async (req, res) => {
  const { nom, prenom, email } = req.body;
  const { query } = require('../../config/db');

  // Vérifier unicité email (hors soi-même)
  const exists = await query(
    'SELECT id FROM users WHERE email=$1 AND id!=$2',
    [email, req.user.id]
  );
  if (exists.rows.length > 0) {
    return res.status(409).json({ success:false, message:'Cet email est déjà utilisé' });
  }

  const { rows } = await query(
    `UPDATE users SET nom=$1, prenom=$2, email=$3
     WHERE id=$4 RETURNING id, nom, prenom, email, role, statut`,
    [nom, prenom, email, req.user.id]
  );
  res.json({ success:true, message:'Profil mis à jour', data:rows[0] });
});

module.exports = router;