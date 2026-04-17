const router = require('express').Router();
const { body, query, param } = require('express-validator');
const ctrl = require('./controller');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');

router.use(authenticate);

const produitRules = [
  body('reference').trim().notEmpty().withMessage('Référence requise'),
  body('nom').trim().notEmpty().withMessage('Nom requis'),
  body('prix_achat_ht').isFloat({ min: 0 }).withMessage('Prix achat invalide'),
  body('prix_vente_ht').isFloat({ min: 0 }).withMessage('Prix vente invalide'),
  body('tva_taux').optional().isFloat({ min: 0, max: 100 }),
  body('stock_minimum').optional().isInt({ min: 0 }),
];

// GET /api/produits
router.get('/', ctrl.getAll);

// GET /api/produits/alertes
router.get('/alertes', ctrl.getAlertes);

// GET /api/produits/:id
router.get('/:id', param('id').isUUID(), validate, ctrl.getOne);

// POST /api/produits
router.post('/', authorize('manager'), produitRules, validate, ctrl.create);

// PUT /api/produits/:id
router.put('/:id', authorize('manager'), param('id').isUUID(), validate, produitRules, validate, ctrl.update);

// PATCH /api/produits/:id/statut
router.patch('/:id/statut', authorize('manager'),
  param('id').isUUID(),
  body('statut').isIn(['actif','inactif','rupture','discontinue']),
  validate, ctrl.updateStatut
);

// GET /api/produits/archives — corbeille
router.get('/archives', authorize('admin'), ctrl.getArchives);

// PATCH /api/produits/:id/restore — restaurer
router.patch('/:id/restore', authorize('admin'), param('id').isUUID(), validate, ctrl.restore);

// DELETE /api/produits/:id — soft delete avec motif optionnel
router.delete('/:id', authorize('admin'),
  [param('id').isUUID(), body('motif').optional().isString()],
  validate, ctrl.remove
);


// DELETE /api/produits/:id/permanent — suppression physique (admin, produit déjà archivé)
router.delete('/:id/permanent', authorize('admin'), param('id').isUUID(), validate, ctrl.hardDelete);

module.exports = router;
