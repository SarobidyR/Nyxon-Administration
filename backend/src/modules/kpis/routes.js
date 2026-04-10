const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth');
const { query }        = require('../../config/db');

router.use(authenticate);

// GET /api/kpis/dashboard
router.get('/dashboard', async (req, res) => {
  // Tout en parallèle pour la performance
  const [
    tempsReel,
    topProduits,
    topClients,
    evolutionCA,
    alertesStock,
  ] = await Promise.all([

    // KPIs temps réel
    query(`SELECT * FROM v_kpi_temps_reel`),

    // Top 5 produits du mois
    query(`
      SELECT
        p.id, p.nom, p.reference,
        SUM(cl.quantite)   AS qte_vendue,
        SUM(cl.total_ht)   AS ca_ht
      FROM commande_lignes cl
      JOIN commandes c  ON c.id  = cl.commande_id
      JOIN produits  p  ON p.id  = cl.produit_id
      WHERE c.statut NOT IN ('annulee','remboursee')
        AND DATE_TRUNC('month', c.created_at) = DATE_TRUNC('month', NOW())
      GROUP BY p.id, p.nom, p.reference
      ORDER BY qte_vendue DESC
      LIMIT 5
    `),

    // Top 5 clients du mois
    query(`
      SELECT
        cli.id,
        COALESCE(cli.raison_sociale, cli.prenom || ' ' || cli.nom) AS nom_complet,
        COUNT(c.id)      AS nb_commandes,
        SUM(c.total_ttc) AS ca_total
      FROM commandes c
      JOIN clients cli ON cli.id = c.client_id
      WHERE c.statut NOT IN ('annulee','remboursee')
        AND DATE_TRUNC('month', c.created_at) = DATE_TRUNC('month', NOW())
      GROUP BY cli.id, nom_complet
      ORDER BY ca_total DESC
      LIMIT 5
    `),

    // Évolution CA sur 7 derniers jours
    query(`
      SELECT
        DATE_TRUNC('day', created_at)::DATE AS jour,
        COUNT(*)         AS nb_commandes,
        SUM(total_ttc)   AS ca_ttc
      FROM commandes
      WHERE created_at >= NOW() - INTERVAL '7 days'
        AND statut NOT IN ('annulee','remboursee')
      GROUP BY jour
      ORDER BY jour ASC
    `),

    // Alertes stock
    query(`
      SELECT id, nom, reference, stock_actuel, stock_minimum,
             CASE WHEN stock_actuel <= 0 THEN 'rupture' ELSE 'alerte' END AS etat
      FROM produits
      WHERE statut = 'actif' AND stock_actuel <= stock_minimum
      ORDER BY stock_actuel ASC
      LIMIT 10
    `),
  ]);

  res.json({
    success: true,
    data: {
      kpis:         tempsReel.rows[0]  || {},
      topProduits:  topProduits.rows,
      topClients:   topClients.rows,
      evolutionCA:  evolutionCA.rows,
      alertesStock: alertesStock.rows,
    },
  });
});

module.exports = router;
