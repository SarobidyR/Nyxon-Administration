const router   = require('express').Router();
const { body, param } = require('express-validator');
const ctrl     = require('./controller');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate  = require('../../middlewares/validate');

router.use(authenticate);

const rules = [
  body('nom').trim().notEmpty().withMessage('Nom de catégorie requis'),
  body('slug').optional().trim()
    .matches(/^[a-z0-9-]+$/).withMessage('Slug : minuscules, chiffres et tirets uniquement'),
  body('parent_id').optional().isUUID().withMessage('parent_id doit être un UUID valide'),
  body('ordre').optional().isInt({ min: 0 }),
];

// GET /api/categories          → liste à plat (paginée)
router.get('/', ctrl.getAll);

// GET /api/categories/tree     → arbre hiérarchique complet
router.get('/tree', ctrl.getTree);

// GET /api/categories/:id
router.get('/:id', param('id').isUUID(), validate, ctrl.getOne);

// POST /api/categories
router.post('/', authorize('manager'), rules, validate, ctrl.create);

// PUT /api/categories/:id
router.put('/:id', authorize('manager'), [param('id').isUUID(), ...rules], validate, ctrl.update);

// PATCH /api/categories/:id/ordre
router.patch('/:id/ordre', authorize('manager'),
  [param('id').isUUID(), body('ordre').isInt({ min: 0 })], validate, ctrl.updateOrdre
);

// DELETE /api/categories/:id
router.delete('/:id', authorize('admin'), param('id').isUUID(), validate, ctrl.remove);

module.exports = router;