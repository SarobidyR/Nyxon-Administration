-- ============================================================
-- Migration 004 : Correction du trigger auto_priorite_precommande
-- Le trigger BEFORE INSERT ne peut pas utiliser NEW.id (pas encore en base)
-- On le remplace par un trigger AFTER INSERT pour les précommandes
-- ============================================================

-- Supprimer l'ancien trigger défaillant
DROP TRIGGER IF EXISTS trg_auto_priorite ON commandes;
DROP FUNCTION IF EXISTS auto_priorite_precommande();

-- Nouvelle fonction : appelée AFTER INSERT uniquement
-- Pour UPDATE de statut, la priorité est recalculée manuellement dans le service
CREATE OR REPLACE FUNCTION auto_priorite_precommande()
RETURNS TRIGGER AS $$
BEGIN
  -- Seulement pour les précommandes actives
  IF NEW.type = 'precommande' AND NEW.statut NOT IN ('livree','annulee','remboursee') THEN
    UPDATE commandes SET priorite = calculer_priorite_precommande(NEW.id)
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- AFTER INSERT : NEW.id existe maintenant en base
CREATE TRIGGER trg_auto_priorite
  AFTER INSERT ON commandes
  FOR EACH ROW
  EXECUTE FUNCTION auto_priorite_precommande();

-- Vérifier que la colonne priorite existe bien (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commandes' AND column_name = 'priorite'
  ) THEN
    ALTER TABLE commandes
      ADD COLUMN priorite      SMALLINT NOT NULL DEFAULT 2 CHECK (priorite BETWEEN 1 AND 3),
      ADD COLUMN priorite_motif TEXT;
    CREATE INDEX idx_commandes_priorite
      ON commandes(priorite, created_at DESC)
      WHERE statut NOT IN ('livree', 'annulee', 'remboursee');
  END IF;
END;
$$;

