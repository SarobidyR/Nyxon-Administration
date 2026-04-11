const router = require('express').Router();
const { query } = require('../../config/db');
const { authenticate, authorize } = require('../../middlewares/auth');

router.use(authenticate);
router.use(authorize('manager'));

// ── GET /api/kpis/dashboard ───────────────────────────────────
router.get('/dashboard', async (req, res) => {
  const [tempsReel, topProduits, topClients, evolutionCA, alertesStock] = await Promise.all([

    query('SELECT * FROM v_kpi_temps_reel'),

    query(`
      SELECT p.id, p.nom, p.reference,
             SUM(cl.quantite) AS qte_vendue,
             SUM(cl.total_ht) AS ca_ht
      FROM commande_lignes cl
      JOIN commandes c ON c.id = cl.commande_id
      JOIN produits  p ON p.id = cl.produit_id
      WHERE c.statut NOT IN ('annulee','remboursee')
        AND DATE_TRUNC('month', c.created_at) = DATE_TRUNC('month', NOW())
      GROUP BY p.id, p.nom, p.reference
      ORDER BY qte_vendue DESC LIMIT 5
    `),

    query(`
      SELECT cli.id,
             COALESCE(cli.raison_sociale, cli.prenom || ' ' || cli.nom) AS nom_complet,
             COUNT(c.id) AS nb_commandes, SUM(c.total_ttc) AS ca_total
      FROM commandes c
      JOIN clients cli ON cli.id = c.client_id
      WHERE c.statut NOT IN ('annulee','remboursee')
        AND DATE_TRUNC('month', c.created_at) = DATE_TRUNC('month', NOW())
      GROUP BY cli.id, nom_complet
      ORDER BY ca_total DESC LIMIT 5
    `),

    query(`
      SELECT DATE_TRUNC('day', created_at)::DATE AS jour,
             COUNT(*) AS nb_commandes, SUM(total_ttc) AS ca_ttc
      FROM commandes
      WHERE created_at >= NOW() - INTERVAL '7 days'
        AND statut NOT IN ('annulee','remboursee')
      GROUP BY jour ORDER BY jour ASC
    `),

    query(`
      SELECT id, nom, reference, stock_actuel, stock_minimum,
             CASE WHEN stock_actuel <= 0 THEN 'rupture' ELSE 'alerte' END AS etat
      FROM produits
      WHERE statut = 'actif' AND stock_actuel <= stock_minimum
      ORDER BY stock_actuel ASC LIMIT 10
    `),
  ]);

  res.json({
    success: true,
    data: {
      kpis:         tempsReel.rows[0] || {},
      topProduits:  topProduits.rows,
      topClients:   topClients.rows,
      evolutionCA:  evolutionCA.rows,
      alertesStock: alertesStock.rows,
    },
  });
});

// ── GET /api/kpis/ventes?periode=mois|annee|custom&debut=&fin=
router.get('/ventes', async (req, res) => {
  const { periode = 'mois', debut, fin } = req.query;
  const now = new Date();
  let dateDebut, dateFin;

  if (periode === 'annee') {
    dateDebut = new Date(now.getFullYear(), 0, 1);
    dateFin   = new Date(now.getFullYear(), 11, 31);
  } else if (periode === 'custom' && debut && fin) {
    dateDebut = new Date(debut);
    dateFin   = new Date(fin);
  } else {
    dateDebut = new Date(now.getFullYear(), now.getMonth(), 1);
    dateFin   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  const [resume, parJour, parCategorie, parStatut] = await Promise.all([

    query(`
      SELECT
        COUNT(*)                    AS nb_commandes,
        COUNT(DISTINCT client_id)   AS nb_clients,
        COALESCE(SUM(total_ht),  0) AS ca_ht,
        COALESCE(SUM(total_ttc), 0) AS ca_ttc,
        COALESCE(SUM(total_tva), 0) AS total_tva,
        COALESCE(AVG(total_ttc), 0) AS panier_moyen
      FROM commandes
      WHERE created_at BETWEEN $1 AND $2
        AND statut NOT IN ('annulee','remboursee')
    `, [dateDebut, dateFin]),

    query(`
      SELECT DATE_TRUNC('day', created_at)::DATE AS jour,
             COUNT(*) AS nb_commandes, SUM(total_ttc) AS ca_ttc, SUM(total_ht) AS ca_ht
      FROM commandes
      WHERE created_at BETWEEN $1 AND $2
        AND statut NOT IN ('annulee','remboursee')
      GROUP BY jour ORDER BY jour ASC
    `, [dateDebut, dateFin]),

    query(`
      SELECT COALESCE(cat.nom, 'Sans catégorie') AS categorie,
             SUM(cl.quantite) AS qte_vendue,
             SUM(cl.total_ht) AS ca_ht,
             SUM(cl.total_ttc) AS ca_ttc
      FROM commande_lignes cl
      JOIN commandes c ON c.id = cl.commande_id
      JOIN produits  p ON p.id = cl.produit_id
      LEFT JOIN categories cat ON cat.id = p.categorie_id
      WHERE c.created_at BETWEEN $1 AND $2
        AND c.statut NOT IN ('annulee','remboursee')
      GROUP BY categorie ORDER BY ca_ht DESC
    `, [dateDebut, dateFin]),

    query(`
      SELECT statut, COUNT(*) AS nb, COALESCE(SUM(total_ttc),0) AS ca
      FROM commandes WHERE created_at BETWEEN $1 AND $2
      GROUP BY statut ORDER BY nb DESC
    `, [dateDebut, dateFin]),
  ]);

  res.json({
    success: true,
    data: {
      periode:      { debut: dateDebut, fin: dateFin, type: periode },
      resume:       resume.rows[0] || {},
      parJour:      parJour.rows,
      parCategorie: parCategorie.rows,
      parStatut:    parStatut.rows,
    },
  });
});

// ── GET /api/kpis/top-produits ────────────────────────────────
router.get('/top-produits', async (req, res) => {
  const { limit = 10 } = req.query;
  const { rows } = await query(`
    SELECT p.id, p.nom, p.reference, p.prix_vente_ttc,
           SUM(cl.quantite)  AS qte_vendue,
           SUM(cl.total_ht)  AS ca_ht,
           SUM(cl.total_ttc) AS ca_ttc,
           SUM(cl.total_ht - (cl.quantite * p.prix_achat_ht)) AS marge,
           RANK() OVER (ORDER BY SUM(cl.quantite) DESC) AS rang
    FROM commande_lignes cl
    JOIN commandes c ON c.id = cl.commande_id
    JOIN produits  p ON p.id = cl.produit_id
    WHERE c.statut NOT IN ('annulee','remboursee')
    GROUP BY p.id, p.nom, p.reference, p.prix_vente_ttc
    ORDER BY qte_vendue DESC LIMIT $1
  `, [limit]);
  res.json({ success: true, data: rows });
});

// ── GET /api/kpis/top-clients ─────────────────────────────────
router.get('/top-clients', async (req, res) => {
  const { limit = 10 } = req.query;
  const { rows } = await query(`
    SELECT cli.id,
           COALESCE(cli.raison_sociale, cli.prenom || ' ' || cli.nom) AS nom_complet,
           cli.email, cli.telephone,
           COUNT(c.id) AS nb_commandes, SUM(c.total_ttc) AS ca_total,
           AVG(c.total_ttc) AS panier_moyen, MAX(c.created_at) AS derniere_commande,
           RANK() OVER (ORDER BY SUM(c.total_ttc) DESC) AS rang
    FROM commandes c
    JOIN clients cli ON cli.id = c.client_id
    WHERE c.statut NOT IN ('annulee','remboursee')
    GROUP BY cli.id, nom_complet, cli.email, cli.telephone
    ORDER BY ca_total DESC LIMIT $1
  `, [limit]);
  res.json({ success: true, data: rows });
});

// ── GET /api/kpis/previsions ──────────────────────────────────
router.get('/previsions', async (req, res) => {
  const { rows: historique } = await query(`
    SELECT DATE_TRUNC('month', c.created_at)::DATE AS mois,
           SUM(cl.quantite)    AS qte_totale,
           SUM(cl.total_ttc)   AS ca_ttc,
           COUNT(DISTINCT c.id) AS nb_commandes
    FROM commandes c
    JOIN commande_lignes cl ON cl.commande_id = c.id
    WHERE c.statut NOT IN ('annulee','remboursee')
      AND c.created_at >= NOW() - INTERVAL '6 months'
    GROUP BY mois ORDER BY mois ASC
  `);

  const n = historique.length;
  let previsions = [];

  if (n >= 2) {
    const xs    = historique.map((_, i) => i);
    const ysCA  = historique.map((r) => parseFloat(r.ca_ttc)    || 0);
    const ysQte = historique.map((r) => parseFloat(r.qte_totale) || 0);

    const regression = (xs, ys) => {
      const sumX  = xs.reduce((a, b) => a + b, 0);
      const sumY  = ys.reduce((a, b) => a + b, 0);
      const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
      const sumX2 = xs.reduce((a, x) => a + x * x, 0);
      const denom = n * sumX2 - sumX * sumX;
      if (denom === 0) return { a: 0, b: sumY / n };
      return {
        a: (n * sumXY - sumX * sumY) / denom,
        b: (sumY - ((n * sumXY - sumX * sumY) / denom) * sumX) / n,
      };
    };

    const regCA  = regression(xs, ysCA);
    const regQte = regression(xs, ysQte);

    for (let i = 1; i <= 3; i++) {
      const x = n - 1 + i;
      const d = new Date();
      d.setDate(1); d.setMonth(d.getMonth() + i);
      previsions.push({
        mois:       d.toISOString().slice(0, 7),
        ca_prevu:   Math.max(0, Math.round(regCA.a  * x + regCA.b)),
        qte_prevue: Math.max(0, Math.round(regQte.a * x + regQte.b)),
        confiance:  Math.min(95, Math.max(40, 80 - (i - 1) * 15)),
      });
    }
  }

  res.json({ success: true, data: { historique, previsions } });
});

// ── GET /api/kpis/stock-valeur ────────────────────────────────
router.get('/stock-valeur', async (req, res) => {
  const [parCategorie, totaux] = await Promise.all([
    query('SELECT * FROM v_valeur_stock ORDER BY valeur_achat DESC'),
    query(`
      SELECT COUNT(*) AS nb_produits, SUM(stock_actuel) AS unites_totales,
             SUM(stock_actuel * prix_achat_ht) AS valeur_achat,
             SUM(stock_actuel * prix_vente_ht) AS valeur_vente,
             COUNT(*) FILTER (WHERE stock_actuel <= 0) AS nb_ruptures,
             COUNT(*) FILTER (WHERE stock_actuel > 0 AND stock_actuel <= stock_minimum) AS nb_alertes
      FROM produits WHERE statut = 'actif'
    `),
  ]);
  res.json({ success: true, data: { parCategorie: parCategorie.rows, totaux: totaux.rows[0] } });
});

module.exports = router;