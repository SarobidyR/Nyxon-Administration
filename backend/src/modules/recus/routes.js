const router = require('express').Router();
const { param, body } = require('express-validator');
const { authenticate, authorize } = require('../../middlewares/auth');
const { query } = require('../../config/db');
const validate = require('../../middlewares/validate');

router.use(authenticate);

// GET /api/recus
router.get('/', async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const { rows: data } = await query(
    `SELECT r.*, c.numero AS commande_numero,
            COALESCE(cli.raison_sociale, cli.prenom || ' ' || cli.nom) AS client_nom
     FROM recus r
     JOIN commandes c ON c.id = r.commande_id
     LEFT JOIN clients cli ON cli.id = r.client_id
     ORDER BY r.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  const { rows: cnt } = await query('SELECT COUNT(*) FROM recus');
  res.json({ success: true, data, total: parseInt(cnt[0].count), page: +page, limit: +limit });
});

// POST /api/recus/generer/:commandeId  — créer/régénérer un reçu
router.post('/generer/:commandeId',
  [param('commandeId').isUUID()],
  validate,
  async (req, res) => {
    const { commandeId } = req.params;

    // Récupérer la commande complète
    const { rows: [cmd] } = await query(
      `SELECT c.*,
              COALESCE(cli.raison_sociale, cli.prenom || ' ' || cli.nom) AS client_nom,
              cli.email AS client_email, cli.telephone AS client_tel,
              cli.adresse AS client_adresse
       FROM commandes c
       LEFT JOIN clients cli ON cli.id = c.client_id
       WHERE c.id = $1`, [commandeId]
    );
    if (!cmd) { const e = new Error('Commande introuvable'); e.statusCode = 404; throw e; }

    const { rows: lignes } = await query(
      'SELECT * FROM commande_lignes WHERE commande_id=$1 ORDER BY created_at ASC', [commandeId]
    );

    // Récupérer config boutique
    const { rows: configs } = await query('SELECT cle, valeur FROM config_boutique');
    const config = Object.fromEntries(configs.map((c) => [c.cle, c.valeur]));

    const dataJson = { commande: cmd, lignes, config };

    // Upsert reçu
    const { rows: [recu] } = await query(
      `INSERT INTO recus
         (commande_id, client_id, data_json, boutique_nom, boutique_adresse,
          boutique_tel, boutique_email, boutique_logo, message_pied, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (commande_id) DO UPDATE SET
         data_json=$3, boutique_nom=$4, boutique_adresse=$5,
         boutique_tel=$6, boutique_email=$7, boutique_logo=$8,
         message_pied=$9, created_by=$10
       RETURNING *`,
      [commandeId, cmd.client_id || null, JSON.stringify(dataJson),
       config.boutique_nom    || 'Nyxon',
       config.boutique_adresse || '',
       config.boutique_tel    || '',
       config.boutique_email  || '',
       config.boutique_logo   || '',
       config.ticket_message  || 'Merci de votre visite !',
       req.user.id]
    );

    res.json({ success: true, message: 'Reçu généré', data: recu });
  }
);

// GET /api/recus/:id
router.get('/:id', param('id').isUUID(), validate, async (req, res) => {
  const { rows: [recu] } = await query('SELECT * FROM recus WHERE id=$1', [req.params.id]);
  if (!recu) { const e = new Error('Reçu introuvable'); e.statusCode = 404; throw e; }
  res.json({ success: true, data: recu });
});

module.exports = router;