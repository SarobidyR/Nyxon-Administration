-- ============================================================
-- Migration 003 : Soft delete produits + priorité commandes
-- ============================================================

-- ── 1. Soft delete sur produits ──────────────────────────────
-- Ajouter les colonnes d'archivage
ALTER TABLE produits
  ADD COLUMN IF NOT EXISTS deleted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by   UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS delete_motif TEXT;

-- Index pour filtrer rapidement les produits non supprimés
CREATE INDEX IF NOT EXISTS idx_produits_not_deleted
  ON produits(id) WHERE deleted_at IS NULL;

-- Vue pour n'exposer que les produits actifs (non archivés)
CREATE OR REPLACE VIEW v_produits_actifs AS
SELECT * FROM produits WHERE deleted_at IS NULL;

-- Vue produits archivés (corbeille)
CREATE OR REPLACE VIEW v_produits_archives AS
SELECT
  p.*,
  u.prenom || ' ' || u.nom AS supprime_par_nom
FROM produits p
LEFT JOIN users u ON u.id = p.deleted_by
WHERE p.deleted_at IS NOT NULL
ORDER BY p.deleted_at DESC;

-- ── 2. Priorité sur les commandes ────────────────────────────
-- 1 = Urgent/Prioritaire, 2 = Normal, 3 = Basse priorité
ALTER TABLE commandes
  ADD COLUMN IF NOT EXISTS priorite     SMALLINT NOT NULL DEFAULT 2
    CHECK (priorite BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS priorite_motif TEXT;   -- justification du niveau de priorité

-- Index pour trier par priorité dans les listes
CREATE INDEX IF NOT EXISTS idx_commandes_priorite
  ON commandes(priorite, created_at DESC)
  WHERE statut NOT IN ('livree', 'annulee', 'remboursee');

-- Commentaires
COMMENT ON COLUMN commandes.priorite IS '1=Urgent, 2=Normal, 3=Faible — calculé auto sur précommandes selon date prise de commande';
COMMENT ON COLUMN produits.deleted_at IS 'NULL = actif, non NULL = archivé (soft delete)';

-- Mettre à jour la vue v_produits_complets pour exclure les archivés par défaut
CREATE OR REPLACE VIEW v_produits_complets AS
SELECT
  p.*,
  m.nom                   AS marque_nom,
  c.nom                   AS categorie_nom,
  f.raison_sociale        AS fournisseur_nom,
  CASE
    WHEN p.stock_actuel <= 0             THEN 'rupture'
    WHEN p.stock_actuel <= p.stock_minimum THEN 'alerte'
    ELSE 'ok'
  END AS etat_stock,
  (p.prix_vente_ht - p.prix_achat_ht)   AS marge_unitaire_ht,
  CASE WHEN p.prix_vente_ht > 0
       THEN ROUND(((p.prix_vente_ht - p.prix_achat_ht) / p.prix_vente_ht * 100)::NUMERIC, 2)
       ELSE 0
  END AS taux_marge_pct
FROM produits p
LEFT JOIN marques    m ON m.id = p.marque_id
LEFT JOIN categories c ON c.id = p.categorie_id
LEFT JOIN fournisseurs f ON f.id = p.fournisseur_id
WHERE p.deleted_at IS NULL;   -- ← exclure les archivés par défaut

-- Fonction pour calculer automatiquement la priorité d'une précommande
-- basée sur sa date de prise de commande relative aux autres précommandes du même produit
CREATE OR REPLACE FUNCTION calculer_priorite_precommande(p_commande_id UUID)
RETURNS SMALLINT AS $$
DECLARE
  v_rang    INTEGER;
  v_total   INTEGER;
BEGIN
  -- Trouver le rang de cette précommande parmi toutes les précommandes actives
  -- pour les mêmes produits, triées par date de création
  SELECT rang, total INTO v_rang, v_total FROM (
    SELECT
      c.id,
      ROW_NUMBER() OVER (ORDER BY c.created_at ASC) AS rang,
      COUNT(*) OVER () AS total
    FROM commandes c
    WHERE c.type = 'precommande'
      AND c.statut NOT IN ('livree', 'annulee', 'remboursee')
      AND EXISTS (
        SELECT 1 FROM commande_lignes cl1
        WHERE cl1.commande_id = c.id
          AND cl1.produit_id IN (
            SELECT cl2.produit_id FROM commande_lignes cl2
            WHERE cl2.commande_id = p_commande_id
          )
      )
  ) ranked
  WHERE id = p_commande_id;

  IF v_total IS NULL OR v_total = 0 THEN RETURN 2; END IF;

  -- Diviser en 3 tiers : premier tiers → 1, dernier tiers → 3, reste → 2
  IF v_rang <= CEIL(v_total::NUMERIC / 3)           THEN RETURN 1;
  ELSIF v_rang <= CEIL(v_total::NUMERIC * 2 / 3)    THEN RETURN 2;
  ELSE                                                    RETURN 3;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger : recalculer la priorité automatiquement sur les précommandes
CREATE OR REPLACE FUNCTION auto_priorite_precommande()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'precommande' AND NEW.statut NOT IN ('livree','annulee','remboursee') THEN
    NEW.priorite := calculer_priorite_precommande(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Le trigger s'applique à l'insertion ET aux changements de statut
CREATE TRIGGER trg_auto_priorite
  BEFORE INSERT OR UPDATE OF statut ON commandes
  FOR EACH ROW
  EXECUTE FUNCTION auto_priorite_precommande();

  -- À ajouter dans 003_softdelete_priorite.sql
ALTER TABLE recus ADD CONSTRAINT recus_commande_id_unique UNIQUE (commande_id);