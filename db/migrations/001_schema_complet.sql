-- ============================================================
-- BOUTIQUE + STOCK — Schéma PostgreSQL complet
-- Version 1.0 | Base transactionnelle
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Recherche full-text

-- ============================================================
-- 1. UTILISATEURS & AUTHENTIFICATION
-- ============================================================

CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'manager', 'vendeur', 'lecteur');
CREATE TYPE user_status AS ENUM ('actif', 'inactif', 'suspendu');

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom           VARCHAR(100) NOT NULL,
    prenom        VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          user_role NOT NULL DEFAULT 'vendeur',
    statut        user_status NOT NULL DEFAULT 'actif',
    avatar_url    TEXT,
    derniere_connexion TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);

-- ============================================================
-- 2. CATALOGUE — MARQUES, CATÉGORIES, FOURNISSEURS
-- ============================================================

CREATE TABLE marques (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom         VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    logo_url    TEXT,
    site_web    VARCHAR(255),
    actif       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
    nom         VARCHAR(150) NOT NULL,
    slug        VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    ordre       INTEGER DEFAULT 0,
    actif       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE fournisseurs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raison_sociale  VARCHAR(200) NOT NULL,
    contact_nom     VARCHAR(150),
    contact_email   VARCHAR(255),
    contact_tel     VARCHAR(30),
    adresse         TEXT,
    ville           VARCHAR(100),
    pays            VARCHAR(100) DEFAULT 'France',
    code_postal     VARCHAR(20),
    num_tva         VARCHAR(50),
    conditions_paiement VARCHAR(100), -- ex: "30 jours net"
    delai_livraison INTEGER,          -- jours
    note            DECIMAL(3,2) CHECK (note BETWEEN 0 AND 5),
    actif           BOOLEAN NOT NULL DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. PRODUITS
-- ============================================================

CREATE TYPE produit_statut AS ENUM ('actif', 'inactif', 'rupture', 'discontinue');

CREATE TABLE produits (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference         VARCHAR(100) NOT NULL UNIQUE,
    code_barre        VARCHAR(100) UNIQUE,
    nom               VARCHAR(255) NOT NULL,
    description       TEXT,
    marque_id         UUID REFERENCES marques(id) ON DELETE SET NULL,
    categorie_id      UUID REFERENCES categories(id) ON DELETE SET NULL,
    fournisseur_id    UUID REFERENCES fournisseurs(id) ON DELETE SET NULL,
    -- Prix
    prix_achat_ht     DECIMAL(12,4) NOT NULL DEFAULT 0,
    prix_vente_ht     DECIMAL(12,4) NOT NULL DEFAULT 0,
    tva_taux          DECIMAL(5,2) NOT NULL DEFAULT 20.00, -- %
    prix_vente_ttc    DECIMAL(12,4) GENERATED ALWAYS AS
                        (prix_vente_ht * (1 + tva_taux / 100)) STORED,
    -- Stock
    stock_actuel      INTEGER NOT NULL DEFAULT 0,
    stock_minimum     INTEGER NOT NULL DEFAULT 1,  -- seuil alerte
    stock_maximum     INTEGER,
    -- Dimensions/poids
    poids_kg          DECIMAL(8,3),
    dimensions        VARCHAR(100), -- "L x l x H cm"
    -- Meta
    images            JSONB DEFAULT '[]',          -- [{url, alt, ordre}]
    attributs         JSONB DEFAULT '{}',           -- {couleur, taille, etc}
    statut            produit_statut NOT NULL DEFAULT 'actif',
    created_by        UUID REFERENCES users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_produits_reference    ON produits(reference);
CREATE INDEX idx_produits_code_barre   ON produits(code_barre);
CREATE INDEX idx_produits_marque       ON produits(marque_id);
CREATE INDEX idx_produits_categorie    ON produits(categorie_id);
CREATE INDEX idx_produits_statut       ON produits(statut);
CREATE INDEX idx_produits_stock_alerte ON produits(stock_actuel) WHERE stock_actuel <= stock_minimum;
CREATE INDEX idx_produits_nom_trgm     ON produits USING gin(nom gin_trgm_ops);

-- Variantes produit (tailles, couleurs...)
CREATE TABLE produit_variantes (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produit_id   UUID NOT NULL REFERENCES produits(id) ON DELETE CASCADE,
    reference    VARCHAR(100) NOT NULL UNIQUE,
    nom          VARCHAR(255) NOT NULL,
    attributs    JSONB NOT NULL DEFAULT '{}', -- {couleur: "rouge", taille: "M"}
    prix_delta   DECIMAL(12,4) DEFAULT 0,     -- différence de prix vs produit parent
    stock        INTEGER NOT NULL DEFAULT 0,
    actif        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_variantes_produit ON produit_variantes(produit_id);

-- ============================================================
-- 4. CLIENTS
-- ============================================================

CREATE TYPE client_type AS ENUM ('particulier', 'professionnel');

CREATE TABLE clients (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type            client_type NOT NULL DEFAULT 'particulier',
    -- Particulier
    nom             VARCHAR(150),
    prenom          VARCHAR(150),
    -- Professionnel
    raison_sociale  VARCHAR(200),
    num_tva         VARCHAR(50),
    siret           VARCHAR(20),
    -- Contact
    email           VARCHAR(255) UNIQUE,
    telephone       VARCHAR(30),
    telephone2      VARCHAR(30),
    -- Adresse principale
    adresse         TEXT,
    ville           VARCHAR(100),
    code_postal     VARCHAR(20),
    pays            VARCHAR(100) DEFAULT 'France',
    -- Adresse de livraison
    livraison_adresse   TEXT,
    livraison_ville     VARCHAR(100),
    livraison_cp        VARCHAR(20),
    livraison_pays      VARCHAR(100),
    -- Stats (mis à jour par trigger)
    nb_commandes    INTEGER NOT NULL DEFAULT 0,
    ca_total        DECIMAL(14,2) NOT NULL DEFAULT 0,
    -- Meta
    notes           TEXT,
    tags            TEXT[],
    actif           BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_email       ON clients(email);
CREATE INDEX idx_clients_telephone   ON clients(telephone);
CREATE INDEX idx_clients_nom_trgm    ON clients USING gin(nom gin_trgm_ops);
CREATE INDEX idx_clients_raison_trgm ON clients USING gin(raison_sociale gin_trgm_ops);

-- ============================================================
-- 5. COMMANDES & PRÉCOMMANDES
-- ============================================================

CREATE TYPE commande_statut AS ENUM (
    'brouillon', 'confirmee', 'en_preparation',
    'expediee', 'livree', 'annulee', 'remboursee'
);
CREATE TYPE commande_type AS ENUM ('vente', 'precommande', 'devis');
CREATE TYPE paiement_statut AS ENUM ('en_attente', 'partiel', 'paye', 'rembourse', 'echoue');
CREATE TYPE paiement_mode AS ENUM ('especes', 'carte', 'virement', 'cheque', 'mobile_money', 'autre');

CREATE TABLE commandes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero              VARCHAR(30) NOT NULL UNIQUE, -- ex: CMD-2024-001234
    type                commande_type NOT NULL DEFAULT 'vente',
    statut              commande_statut NOT NULL DEFAULT 'brouillon',
    client_id           UUID REFERENCES clients(id) ON DELETE SET NULL,
    vendeur_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    -- Montants
    sous_total_ht       DECIMAL(14,4) NOT NULL DEFAULT 0,
    remise_pct          DECIMAL(5,2) NOT NULL DEFAULT 0,
    remise_montant      DECIMAL(14,4) NOT NULL DEFAULT 0,
    total_ht            DECIMAL(14,4) NOT NULL DEFAULT 0,
    total_tva           DECIMAL(14,4) NOT NULL DEFAULT 0,
    frais_livraison     DECIMAL(14,4) NOT NULL DEFAULT 0,
    total_ttc           DECIMAL(14,4) NOT NULL DEFAULT 0,
    -- Paiement
    paiement_statut     paiement_statut NOT NULL DEFAULT 'en_attente',
    paiement_mode       paiement_mode,
    montant_paye        DECIMAL(14,4) NOT NULL DEFAULT 0,
    -- Livraison
    adresse_livraison   TEXT,
    date_livraison_prev TIMESTAMPTZ,
    date_livraison_reel TIMESTAMPTZ,
    -- Précommande
    date_disponibilite  DATE,            -- pour les précommandes
    acompte_verse       DECIMAL(14,4),
    -- Meta
    notes               TEXT,
    notes_internes      TEXT,
    created_by          UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at        TIMESTAMPTZ,
    shipped_at          TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ
);

CREATE INDEX idx_commandes_numero     ON commandes(numero);
CREATE INDEX idx_commandes_client     ON commandes(client_id);
CREATE INDEX idx_commandes_statut     ON commandes(statut);
CREATE INDEX idx_commandes_type       ON commandes(type);
CREATE INDEX idx_commandes_date       ON commandes(created_at DESC);
CREATE INDEX idx_commandes_vendeur    ON commandes(vendeur_id);

CREATE TABLE commande_lignes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commande_id     UUID NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
    produit_id      UUID REFERENCES produits(id) ON DELETE SET NULL,
    variante_id     UUID REFERENCES produit_variantes(id) ON DELETE SET NULL,
    -- Snapshot prix au moment de la vente
    produit_nom     VARCHAR(255) NOT NULL,
    produit_ref     VARCHAR(100),
    quantite        INTEGER NOT NULL CHECK (quantite > 0),
    prix_unitaire_ht DECIMAL(12,4) NOT NULL,
    tva_taux        DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    remise_pct      DECIMAL(5,2) NOT NULL DEFAULT 0,
    total_ht        DECIMAL(14,4) NOT NULL,
    total_ttc       DECIMAL(14,4) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lignes_commande ON commande_lignes(commande_id);
CREATE INDEX idx_lignes_produit  ON commande_lignes(produit_id);

-- Historique des statuts de commande
CREATE TABLE commande_historique (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    commande_id  UUID NOT NULL REFERENCES commandes(id) ON DELETE CASCADE,
    statut       commande_statut NOT NULL,
    commentaire  TEXT,
    created_by   UUID REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_historique_commande ON commande_historique(commande_id);

-- ============================================================
-- 6. STOCK — MOUVEMENTS & INVENTAIRES
-- ============================================================

CREATE TYPE mouvement_type AS ENUM (
    'entree_achat', 'entree_retour', 'entree_ajustement',
    'sortie_vente', 'sortie_perte', 'sortie_ajustement', 'transfert'
);

CREATE TABLE stock_mouvements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produit_id      UUID NOT NULL REFERENCES produits(id) ON DELETE RESTRICT,
    variante_id     UUID REFERENCES produit_variantes(id) ON DELETE SET NULL,
    type            mouvement_type NOT NULL,
    quantite        INTEGER NOT NULL,  -- positif = entrée, négatif = sortie
    stock_avant     INTEGER NOT NULL,
    stock_apres     INTEGER NOT NULL,
    prix_unitaire   DECIMAL(12,4),
    commande_id     UUID REFERENCES commandes(id) ON DELETE SET NULL,
    reference_doc   VARCHAR(100),      -- n° BL, facture fournisseur...
    motif           TEXT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mouvements_produit ON stock_mouvements(produit_id);
CREATE INDEX idx_mouvements_type    ON stock_mouvements(type);
CREATE INDEX idx_mouvements_date    ON stock_mouvements(created_at DESC);
CREATE INDEX idx_mouvements_commande ON stock_mouvements(commande_id);

-- Inventaires périodiques
CREATE TYPE inventaire_statut AS ENUM ('en_cours', 'valide', 'annule');

CREATE TABLE inventaires (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference   VARCHAR(50) NOT NULL UNIQUE,
    statut      inventaire_statut NOT NULL DEFAULT 'en_cours',
    notes       TEXT,
    created_by  UUID REFERENCES users(id),
    validated_by UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    validated_at TIMESTAMPTZ
);

CREATE TABLE inventaire_lignes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventaire_id   UUID NOT NULL REFERENCES inventaires(id) ON DELETE CASCADE,
    produit_id      UUID NOT NULL REFERENCES produits(id),
    stock_theorique INTEGER NOT NULL,
    stock_reel      INTEGER NOT NULL,
    ecart           INTEGER GENERATED ALWAYS AS (stock_reel - stock_theorique) STORED,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventaire_lignes_inv ON inventaire_lignes(inventaire_id);

-- ============================================================
-- 7. REÇUS / TICKETS DE CAISSE
-- ============================================================

CREATE TABLE recus (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero          VARCHAR(30) NOT NULL UNIQUE, -- REC-2024-001234
    commande_id     UUID NOT NULL REFERENCES commandes(id),
    client_id       UUID REFERENCES clients(id),
    -- Données snapshot
    data_json       JSONB NOT NULL,  -- snapshot complet pour re-génération
    -- Config affichage
    boutique_nom    VARCHAR(200),
    boutique_adresse TEXT,
    boutique_tel    VARCHAR(50),
    boutique_email  VARCHAR(255),
    boutique_logo   TEXT,
    message_pied    TEXT,
    -- Export
    jpeg_url        TEXT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recus_commande ON recus(commande_id);
CREATE INDEX idx_recus_date     ON recus(created_at DESC);

-- ============================================================
-- 8. ADS BUDGET — FACEBOOK & INSTAGRAM
-- ============================================================

CREATE TYPE ads_plateforme AS ENUM ('facebook', 'instagram', 'facebook_instagram');
CREATE TYPE ads_objectif AS ENUM ('notoriete', 'trafic', 'conversions', 'ventes', 'engagement');
CREATE TYPE ads_statut AS ENUM ('planifiee', 'active', 'pausee', 'terminee', 'annulee');

CREATE TABLE ads_campagnes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nom             VARCHAR(200) NOT NULL,
    plateforme      ads_plateforme NOT NULL,
    objectif        ads_objectif NOT NULL,
    statut          ads_statut NOT NULL DEFAULT 'planifiee',
    budget_total    DECIMAL(14,2) NOT NULL,
    budget_journalier DECIMAL(10,2),
    depense_actuelle DECIMAL(14,2) NOT NULL DEFAULT 0,
    date_debut      DATE NOT NULL,
    date_fin        DATE,
    -- KPIs campagne
    impressions     BIGINT DEFAULT 0,
    clics           BIGINT DEFAULT 0,
    conversions     INTEGER DEFAULT 0,
    revenus_generes DECIMAL(14,2) DEFAULT 0,
    -- Calculé
    cpc             DECIMAL(10,4) GENERATED ALWAYS AS
                      (CASE WHEN clics > 0 THEN depense_actuelle / clics ELSE 0 END) STORED,
    roas            DECIMAL(10,4) GENERATED ALWAYS AS
                      (CASE WHEN depense_actuelle > 0 THEN revenus_generes / depense_actuelle ELSE 0 END) STORED,
    notes           TEXT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ads_statut    ON ads_campagnes(statut);
CREATE INDEX idx_ads_dates     ON ads_campagnes(date_debut, date_fin);

-- Dépenses journalières par campagne
CREATE TABLE ads_depenses_quotidiennes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campagne_id     UUID NOT NULL REFERENCES ads_campagnes(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    depense         DECIMAL(10,2) NOT NULL,
    impressions     BIGINT DEFAULT 0,
    clics           BIGINT DEFAULT 0,
    conversions     INTEGER DEFAULT 0,
    revenus         DECIMAL(14,2) DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campagne_id, date)
);

CREATE INDEX idx_depenses_campagne ON ads_depenses_quotidiennes(campagne_id);
CREATE INDEX idx_depenses_date     ON ads_depenses_quotidiennes(date DESC);

-- ============================================================
-- 9. KPI & ANALYTICS
-- ============================================================

-- Snapshot journalier des KPIs (calculé chaque nuit)
CREATE TABLE kpi_journalier (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date            DATE NOT NULL UNIQUE,
    -- Ventes
    nb_commandes        INTEGER DEFAULT 0,
    nb_commandes_annulees INTEGER DEFAULT 0,
    ca_ht               DECIMAL(14,2) DEFAULT 0,
    ca_ttc              DECIMAL(14,2) DEFAULT 0,
    marge_brute         DECIMAL(14,2) DEFAULT 0,
    taux_marge          DECIMAL(6,2) DEFAULT 0,
    -- Clients
    nb_nouveaux_clients INTEGER DEFAULT 0,
    nb_clients_actifs   INTEGER DEFAULT 0,
    panier_moyen        DECIMAL(10,2) DEFAULT 0,
    -- Stock
    valeur_stock        DECIMAL(14,2) DEFAULT 0,
    nb_ruptures         INTEGER DEFAULT 0,
    nb_alertes_stock    INTEGER DEFAULT 0,
    -- Ads
    depenses_ads        DECIMAL(10,2) DEFAULT 0,
    revenus_ads         DECIMAL(14,2) DEFAULT 0,
    roas_global         DECIMAL(10,4) DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Top produits (mis à jour hebdo)
CREATE TABLE kpi_top_produits (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    periode_debut   DATE NOT NULL,
    periode_fin     DATE NOT NULL,
    produit_id      UUID REFERENCES produits(id),
    produit_nom     VARCHAR(255) NOT NULL,
    rang            INTEGER NOT NULL,
    qte_vendue      INTEGER DEFAULT 0,
    ca_ht           DECIMAL(14,2) DEFAULT 0,
    marge           DECIMAL(14,2) DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Top clients
CREATE TABLE kpi_top_clients (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    periode_debut   DATE NOT NULL,
    periode_fin     DATE NOT NULL,
    client_id       UUID REFERENCES clients(id),
    client_nom      VARCHAR(255) NOT NULL,
    rang            INTEGER NOT NULL,
    nb_commandes    INTEGER DEFAULT 0,
    ca_total        DECIMAL(14,2) DEFAULT 0,
    panier_moyen    DECIMAL(10,2) DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 10. PRÉVISIONS DE VENTES
-- ============================================================

CREATE TABLE previsions_ventes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produit_id      UUID REFERENCES produits(id),
    periode         DATE NOT NULL,              -- 1er du mois
    qte_prevue      INTEGER NOT NULL,
    qte_reelle      INTEGER,                    -- rempli à posteriori
    methode         VARCHAR(50) DEFAULT 'regression_lineaire',
    confiance       DECIMAL(5,2),               -- % de confiance
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (produit_id, periode)
);

CREATE INDEX idx_previsions_produit ON previsions_ventes(produit_id);
CREATE INDEX idx_previsions_periode ON previsions_ventes(periode);

-- ============================================================
-- 11. CONFIGURATION BOUTIQUE
-- ============================================================

CREATE TABLE config_boutique (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cle             VARCHAR(100) NOT NULL UNIQUE,
    valeur          TEXT,
    description     TEXT,
    updated_by      UUID REFERENCES users(id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Valeurs par défaut
INSERT INTO config_boutique (cle, valeur, description) VALUES
    ('boutique_nom',      'Ma Boutique',      'Nom de la boutique'),
    ('boutique_adresse',  '',                 'Adresse complète'),
    ('boutique_tel',      '',                 'Téléphone'),
    ('boutique_email',    '',                 'Email de contact'),
    ('boutique_logo',     '',                 'URL du logo'),
    ('devise',            'MGA',              'Devise (ISO 4217)'),
    ('tva_defaut',        '20',               'Taux TVA par défaut (%)'),
    ('ticket_message',    'Merci de votre visite !', 'Message pied de ticket'),
    ('numero_cmd_prefix', 'CMD',              'Préfixe numéros de commande'),
    ('stock_alerte_email','',                 'Email alertes stock');

-- ============================================================
-- 12. TRIGGERS — Mise à jour automatique
-- ============================================================

-- updated_at automatique
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at       BEFORE UPDATE ON users             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_produits_updated_at    BEFORE UPDATE ON produits           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_clients_updated_at     BEFORE UPDATE ON clients            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_commandes_updated_at   BEFORE UPDATE ON commandes          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_marques_updated_at     BEFORE UPDATE ON marques            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_fournisseurs_updated_at BEFORE UPDATE ON fournisseurs      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_ads_updated_at         BEFORE UPDATE ON ads_campagnes      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Numérotation automatique des commandes
CREATE OR REPLACE FUNCTION generer_numero_commande()
RETURNS TRIGGER AS $$
DECLARE
    seq INT;
    prefix TEXT;
BEGIN
    SELECT valeur INTO prefix FROM config_boutique WHERE cle = 'numero_cmd_prefix';
    prefix := COALESCE(prefix, 'CMD');
    SELECT COUNT(*) + 1 INTO seq FROM commandes WHERE DATE_TRUNC('year', created_at) = DATE_TRUNC('year', NOW());
    NEW.numero := prefix || '-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(seq::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_commande_numero
    BEFORE INSERT ON commandes
    FOR EACH ROW WHEN (NEW.numero IS NULL OR NEW.numero = '')
    EXECUTE FUNCTION generer_numero_commande();

-- Mise à jour du stock après mouvement
CREATE OR REPLACE FUNCTION update_stock_apres_mouvement()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE produits SET stock_actuel = NEW.stock_apres WHERE id = NEW.produit_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_stock
    AFTER INSERT ON stock_mouvements
    FOR EACH ROW EXECUTE FUNCTION update_stock_apres_mouvement();

-- Mise à jour stats client après commande livrée
CREATE OR REPLACE FUNCTION update_stats_client()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.statut = 'livree' AND OLD.statut != 'livree' THEN
        UPDATE clients SET
            nb_commandes = nb_commandes + 1,
            ca_total     = ca_total + NEW.total_ttc
        WHERE id = NEW.client_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stats_client
    AFTER UPDATE ON commandes
    FOR EACH ROW EXECUTE FUNCTION update_stats_client();

-- Numérotation des reçus
CREATE OR REPLACE FUNCTION generer_numero_recu()
RETURNS TRIGGER AS $$
DECLARE seq INT;
BEGIN
    SELECT COUNT(*) + 1 INTO seq FROM recus WHERE DATE_TRUNC('year', created_at) = DATE_TRUNC('year', NOW());
    NEW.numero := 'REC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(seq::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recu_numero
    BEFORE INSERT ON recus
    FOR EACH ROW WHEN (NEW.numero IS NULL OR NEW.numero = '')
    EXECUTE FUNCTION generer_numero_recu();

-- ============================================================
-- 13. VUES UTILES
-- ============================================================

-- Vue produits avec infos complètes + alerte stock
CREATE VIEW v_produits_complets AS
SELECT
    p.*,
    m.nom AS marque_nom,
    c.nom AS categorie_nom,
    f.raison_sociale AS fournisseur_nom,
    CASE WHEN p.stock_actuel <= 0 THEN 'rupture'
         WHEN p.stock_actuel <= p.stock_minimum THEN 'alerte'
         ELSE 'ok'
    END AS etat_stock,
    (p.prix_vente_ht - p.prix_achat_ht) AS marge_unitaire_ht,
    CASE WHEN p.prix_vente_ht > 0
         THEN ROUND(((p.prix_vente_ht - p.prix_achat_ht) / p.prix_vente_ht * 100)::NUMERIC, 2)
         ELSE 0
    END AS taux_marge_pct
FROM produits p
LEFT JOIN marques m     ON m.id = p.marque_id
LEFT JOIN categories c  ON c.id = p.categorie_id
LEFT JOIN fournisseurs f ON f.id = p.fournisseur_id;

-- Vue commandes avec total client
CREATE VIEW v_commandes_detail AS
SELECT
    cmd.*,
    c.nom AS client_nom, c.prenom AS client_prenom,
    c.email AS client_email,
    u.nom AS vendeur_nom, u.prenom AS vendeur_prenom,
    (SELECT COUNT(*) FROM commande_lignes cl WHERE cl.commande_id = cmd.id) AS nb_lignes
FROM commandes cmd
LEFT JOIN clients c ON c.id = cmd.client_id
LEFT JOIN users u   ON u.id = cmd.vendeur_id;

-- Vue dashboard KPIs temps réel
CREATE VIEW v_kpi_temps_reel AS
SELECT
    -- Aujourd'hui
    (SELECT COUNT(*) FROM commandes WHERE DATE_TRUNC('day', created_at) = CURRENT_DATE AND statut NOT IN ('annulee','remboursee')) AS cmds_aujourd_hui,
    (SELECT COALESCE(SUM(total_ttc),0) FROM commandes WHERE DATE_TRUNC('day', created_at) = CURRENT_DATE AND statut NOT IN ('annulee','remboursee')) AS ca_aujourd_hui,
    -- Ce mois
    (SELECT COUNT(*) FROM commandes WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE) AND statut NOT IN ('annulee','remboursee')) AS cmds_mois,
    (SELECT COALESCE(SUM(total_ttc),0) FROM commandes WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE) AND statut NOT IN ('annulee','remboursee')) AS ca_mois,
    -- Stock
    (SELECT COUNT(*) FROM produits WHERE stock_actuel <= 0) AS nb_ruptures,
    (SELECT COUNT(*) FROM produits WHERE stock_actuel > 0 AND stock_actuel <= stock_minimum) AS nb_alertes,
    (SELECT COUNT(*) FROM commandes WHERE statut = 'confirmee') AS cmds_en_attente,
    (SELECT COUNT(*) FROM commandes WHERE type = 'precommande' AND statut NOT IN ('livree','annulee')) AS precommandes_actives;

-- Vue valeur totale du stock
CREATE VIEW v_valeur_stock AS
SELECT
    c.nom AS categorie,
    COUNT(p.id) AS nb_produits,
    SUM(p.stock_actuel) AS unites_totales,
    SUM(p.stock_actuel * p.prix_achat_ht) AS valeur_achat,
    SUM(p.stock_actuel * p.prix_vente_ht) AS valeur_vente_potentielle
FROM produits p
LEFT JOIN categories c ON c.id = p.categorie_id
WHERE p.statut = 'actif'
GROUP BY c.nom;

-- ============================================================
-- 14. DONNÉES DE TEST (seed)
-- ============================================================

-- Utilisateur admin par défaut
INSERT INTO users (nom, prenom, email, password_hash, role) VALUES
    ('Admin', 'Super', 'admin@boutique.com', '$2b$12$PLACEHOLDER_HASH_CHANGE_ME', 'superadmin');

-- Quelques catégories
INSERT INTO categories (nom, slug) VALUES
    ('Vêtements',    'vetements'),
    ('Électronique', 'electronique'),
    ('Accessoires',  'accessoires'),
    ('Alimentation', 'alimentation');

COMMENT ON TABLE users               IS 'Utilisateurs de l''application avec rôles';
COMMENT ON TABLE produits            IS 'Catalogue produits de la boutique';
COMMENT ON TABLE clients             IS 'Clients particuliers et professionnels';
COMMENT ON TABLE commandes           IS 'Commandes et précommandes clients';
COMMENT ON TABLE commande_lignes     IS 'Lignes de chaque commande (snapshot prix)';
COMMENT ON TABLE stock_mouvements    IS 'Journal de tous les mouvements de stock';
COMMENT ON TABLE ads_campagnes       IS 'Campagnes publicitaires Facebook/Instagram';
COMMENT ON TABLE kpi_journalier      IS 'Snapshot KPIs calculés chaque nuit';
COMMENT ON TABLE recus               IS 'Tickets de caisse exportables en JPEG';

-- Recalcule stock_actuel depuis les mouvements (à appeler périodiquement ou manuellement)
CREATE OR REPLACE FUNCTION reconcilier_stock(p_produit_id UUID DEFAULT NULL)
RETURNS void AS $$
BEGIN
    UPDATE produits p SET
        stock_actuel = COALESCE((
            SELECT SUM(quantite)
            FROM stock_mouvements
            WHERE produit_id = p.id
        ), 0)
    WHERE (p_produit_id IS NULL OR p.id = p_produit_id);
END;
$$ LANGUAGE plpgsql;