const router = require('express').Router();
const { body, param } = require('express-validator');
const ctrl = require('./controller');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');

router.use(authenticate);

const rules = [
  body('raison_sociale').trim().notEmpty().withMessage('Raison sociale requise'),
  body('contact_email').optional().isEmail().normalizeEmail(),
  body('delai_livraison').optional().isInt({ min: 0 }),
  body('note').optional().isFloat({ min: 0, max: 5 }),
];

router.get('/',    ctrl.getAll);
router.get('/:id', param('id').isUUID(), validate, ctrl.getOne);
router.post('/',   authorize('manager'), rules, validate, ctrl.create);
router.put('/:id', authorize('manager'), [param('id').isUUID(), ...rules], validate, ctrl.update);
router.delete('/:id', authorize('admin'), param('id').isUUID(), validate, ctrl.remove);

module.exports = router;