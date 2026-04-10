const router = require('express').Router();
const { body, param } = require('express-validator');
const ctrl   = require('./controller');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');

router.use(authenticate);
router.use(authorize('manager'));

// GET /api/stock/mouvements
router.get('/mouvements', ctrl.getMouvements);

// GET /api/stock/mouvements/:produitId
router.get('/mouvements/:produitId', param('produitId').isUUID(), validate, ctrl.getMouvementsProduit);

// GET /api/stock/valeur
router.get('/valeur', ctrl.getValeurStock);

// POST /api/stock/entree  — réception marchandise
router.post('/entree',
  [
    body('produit_id').isUUID().withMessage('produit_id invalide'),
    body('quantite').isInt({ min: 1 }).withMessage('Quantité invalide (min 1)'),
    body('prix_unitaire').optional().isFloat({ min: 0 }),
    body('reference_doc').optional().isString(),
    body('motif').optional().isString(),
  ],
  validate, ctrl.entree
);

// POST /api/stock/sortie  — sortie manuelle (perte, casse...)
router.post('/sortie',
  [
    body('produit_id').isUUID().withMessage('produit_id invalide'),
    body('quantite').isInt({ min: 1 }).withMessage('Quantité invalide (min 1)'),
    body('motif').notEmpty().withMessage('Motif requis pour une sortie manuelle'),
  ],
  validate, ctrl.sortie
);

// POST /api/stock/ajustement  — correction inventaire
router.post('/ajustement',
  [
    body('produit_id').isUUID().withMessage('produit_id invalide'),
    body('stock_reel').isInt({ min: 0 }).withMessage('Stock réel invalide'),
    body('motif').notEmpty().withMessage('Motif requis'),
  ],
  validate, ctrl.ajustement
);

// POST /api/stock/inventaire  — sauvegarder un inventaire complet
router.post('/inventaire', authorize('admin'),
  [
    body('lignes').isArray({ min: 1 }),
    body('lignes.*.produit_id').isUUID(),
    body('lignes.*.stock_reel').isInt({ min: 0 }),
  ],
  validate, ctrl.creerInventaire
);

// GET /api/stock/inventaires
router.get('/inventaires', ctrl.getInventaires);

// PATCH /api/stock/inventaires/:id/valider
router.patch('/inventaires/:id/valider', authorize('admin'),
  param('id').isUUID(), validate, ctrl.validerInventaire
);

module.exports = router;