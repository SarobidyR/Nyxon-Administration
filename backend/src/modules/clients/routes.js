const router = require('express').Router();
const { body, param } = require('express-validator');
const ctrl = require('./controller');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');

router.use(authenticate);

const rules = [
  body('type').isIn(['particulier','professionnel']).withMessage('Type invalide'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Email invalide'),
];

router.get('/',    ctrl.getAll);
router.get('/top', ctrl.getTop);
router.get('/:id', param('id').isUUID(), validate, ctrl.getOne);
router.post('/',   authorize('vendeur'), rules, validate, ctrl.create);
router.put('/:id', authorize('vendeur'), [param('id').isUUID(), ...rules], validate, ctrl.update);
router.delete('/:id', authorize('manager'), param('id').isUUID(), validate, ctrl.remove);

module.exports = router;