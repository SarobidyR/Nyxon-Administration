const router = require('express').Router();
const { body, param } = require('express-validator');
const ctrl    = require('./controller');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');

router.use(authenticate);
router.use(authorize('manager'));

const campagneRules = [
  body('nom').trim().notEmpty().withMessage('Nom requis'),
  body('plateforme').isIn(['facebook','instagram','facebook_instagram']).withMessage('Plateforme invalide'),
  body('objectif').isIn(['notoriete','trafic','conversions','ventes','engagement']).withMessage('Objectif invalide'),
  body('budget_total').isFloat({ min: 0 }).withMessage('Budget invalide'),
  body('date_debut').isDate().withMessage('Date de début invalide'),
  body('date_fin').optional().isDate(),
  body('budget_journalier').optional().isFloat({ min: 0 }),
];

// GET /api/ads/campagnes
router.get('/campagnes', ctrl.getAll);

// GET /api/ads/campagnes/resume
router.get('/campagnes/resume', ctrl.getResume);

// GET /api/ads/campagnes/:id
router.get('/campagnes/:id', param('id').isUUID(), validate, ctrl.getOne);

// POST /api/ads/campagnes
router.post('/campagnes', campagneRules, validate, ctrl.create);

// PUT /api/ads/campagnes/:id
router.put('/campagnes/:id', [param('id').isUUID(), ...campagneRules], validate, ctrl.update);

// PATCH /api/ads/campagnes/:id/statut
router.patch('/campagnes/:id/statut',
  [param('id').isUUID(), body('statut').isIn(['planifiee','active','pausee','terminee','annulee'])],
  validate, ctrl.updateStatut
);

// POST /api/ads/campagnes/:id/depenses  — enregistrer dépense du jour
router.post('/campagnes/:id/depenses',
  [
    param('id').isUUID(),
    body('date').isDate().withMessage('Date invalide'),
    body('depense').isFloat({ min: 0 }).withMessage('Dépense invalide'),
    body('impressions').optional().isInt({ min: 0 }),
    body('clics').optional().isInt({ min: 0 }),
    body('conversions').optional().isInt({ min: 0 }),
    body('revenus').optional().isFloat({ min: 0 }),
  ],
  validate, ctrl.ajouterDepense
);

// GET /api/ads/campagnes/:id/depenses
router.get('/campagnes/:id/depenses', param('id').isUUID(), validate, ctrl.getDepenses);

// DELETE /api/ads/campagnes/:id
router.delete('/campagnes/:id', authorize('admin'), param('id').isUUID(), validate, ctrl.remove);

module.exports = router;