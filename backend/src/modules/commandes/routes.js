const router = require('express').Router();
const {body,param,query}= require ('express-validator');
const ctrl = require('./controller');
const {authentificate, authorize}= require ('../../middlewares/auth');
const validate  = require('../../middlewares/validate');

router.use(authentificate);

// ── Validation lignes de commande ─────────────────────────────
const ligneRules=[
    body('lignes').isArray({min:1}).withMessage('Au moins une ligne requise'),
    body('lignes.*.produit_id').isUUID().withMessage('produit_id invalide'),
    body('lignes.*.quantite').isInt({min:1}).withMessage('Quantité Invalide'),
    body('lignes.*.prix_unitaire_ht').isFloat({min:0}).withMessage('Prix Invalide'),
    body('lignes.*.remise_pct').optional({min:1}).isFloat({min:0, max:100}),

];

const commandeRules=[
    body('client_id').optional().isUUID(),
    body('type').optional().isIn(['vente','precommande','devis']),
    body('remise_pct').optional().isFloat({ min: 0, max: 100 }),
    body('paiement_mode').optional().isIn(['especes','carte','virement','cheque','mobile_money','autre']),
    body('notes').optional().isString(),
    ...ligneRules,
];

// GET/api/commandes
router.get('/',ctrl.getAll);

// GET/api/commandes/stats
router.get('/stats',authorize('manager'),ctrl.getStats);

// GET/api/commandes/:id
router.get('/:id',param('id').isUUID(),validate,ctrl.getOne);

// POST api/commandes
router.post('/',authorize('vendeur'),commandeRules,validate,ctrl.create);

// PUT /api/commandes/:id
router.put('/:id',authorize('vendeur'),
    [
        param('id').isUUID(),
        body('statut').isIn(['confirmee','en preparation','expediee','livree','annulee','remboursee'])
        .withMessage('Statut invalide'),
        body('commentaire').optional().isString(),
    ],
    validate, ctrl.upddateStatut
);

// PATCH /api/commandes/:id/paiement
router.patch('/:id/paiement', authorize('vendeur'),
  [
    param('id').isUUID(),
    body('montant').isFloat({ min: 0 }).withMessage('Montant invalide'),
    body('mode').isIn(['especes','carte','virement','cheque','mobile_money','autre']),
  ],
  validate,ctrl.enregistrerPaiement
);

// DELETE /api/commandes/:id - annulation uniquement
router.delete('/:id',authorize('manager'),param('id').isUUID(),validate,ctrl.annuler);

module.exports= router;