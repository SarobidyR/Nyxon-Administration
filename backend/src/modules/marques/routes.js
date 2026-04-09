const router  = require('express').Router();
const { body, param } = require('express-validator');
const ctrl    = require('./controller');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');

router.use(authenticate);

const rules = [
  body('nom').trim().notEmpty().withMessage('Nom de marque requis'),
  body('site_web').optional().isURL().withMessage('URL invalide'),
];

// GET /api/marques
router.get('/', ctrl.getAll);

// GET /api/marques/:id
router.get('/:id', param('id').isUUID(), validate, ctrl.getOne);

// POST /api/marques
router.post('/', authorize('manager'), rules, validate, ctrl.create);

// PUT /api/marques/:id
router.put('/:id', authorize('manager'), [param('id').isUUID(), ...rules], validate, ctrl.update);

// PATCH /api/marques/:id/statut
router.patch('/:id/statut', authorize('manager'),
  [param('id').isUUID(), body('actif').isBoolean()], validate, ctrl.toggleActif
);

// DELETE /api/marques/:id
router.delete('/:id', authorize('admin'), param('id').isUUID(), validate, ctrl.remove);

module.exports = router;