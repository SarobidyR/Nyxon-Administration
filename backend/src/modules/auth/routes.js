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

module.exports = router;