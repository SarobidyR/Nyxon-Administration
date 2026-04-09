-- ============================================================
-- DONNÉES DE TEST RÉALISTES
-- ============================================================

-- Marques
INSERT INTO marques (nom, description, actif) VALUES
    ('Samsung',    'Électronique grand public', TRUE),
    ('Nike',       'Sport & lifestyle',          TRUE),
    ('Adidas',     'Sport & lifestyle',          TRUE),
    ('Apple',      'Technologie premium',        TRUE),
    ('Local Brand','Marque locale',              TRUE);

-- Fournisseurs
INSERT INTO fournisseurs (raison_sociale, contact_nom, contact_email, contact_tel, pays, conditions_paiement, delai_livraison) VALUES
    ('Tech Import SARL',   'Jean Dupont',  'jean@techimport.mg',  '+261 20 22 123 45', 'Chine', '30 jours net', 7),
    ('Mode Distribution',  'Marie Claire', 'mc@modedist.mg',      '+261 20 22 678 90', 'Chine', 'Comptant',     3),
    ('Grossiste Central',  'Paul Martin',  'paul@grossiste.mg',   '+261 20 22 111 22', 'Chine', '15 jours net', 5);

-- Produits variés
WITH cats AS (SELECT id, slug FROM categories)
INSERT INTO produits (reference, nom, description, categorie_id, prix_achat_ht, prix_vente_ht, tva_taux, stock_actuel, stock_minimum)
SELECT
    ref, nom, desc_, cat_id, pa, pv, tva, stock, stock_min
FROM (VALUES
    ('ELEC-001', 'Smartphone Samsung A54', 'Écran 6.4", 128Go', (SELECT id FROM cats WHERE slug='electronique'), 180000, 280000, 20, 15, 3),
    ('ELEC-002', 'Écouteurs Bluetooth',    'Sans fil, autonomie 8h',  (SELECT id FROM cats WHERE slug='electronique'), 12000,  25000,  20, 30, 5),
    ('ELEC-003', 'Chargeur Rapide 65W',    'USB-C, compatible universelle', (SELECT id FROM cats WHERE slug='electronique'), 8000, 18000, 20, 25, 5),
    ('VET-001',  'T-Shirt Nike Dry-Fit',   'Polyester respirant',     (SELECT id FROM cats WHERE slug='vetements'),     4500,   12000,  20, 50, 10),
    ('VET-002',  'Short Adidas Running',   '100% polyester recyclé',  (SELECT id FROM cats WHERE slug='vetements'),     6000,   15000,  20, 35, 8),
    ('ACC-001',  'Sac à dos 30L',          'Imperméable, compartiments laptop', (SELECT id FROM cats WHERE slug='accessoires'), 15000, 38000, 20, 20, 4),
    ('ACC-002',  'Montre Sport',           'Étanche 50m, GPS intégré',(SELECT id FROM cats WHERE slug='accessoires'),   22000,  55000,  20, 8,  2),
    ('ALI-001',  'Barre Protéinée x12',    'Chocolat, 20g protéines', (SELECT id FROM cats WHERE slug='alimentation'),  3600,   8500,   0,  60, 15),
    ('ALI-002',  'Boisson Énergisante x24','500ml, citron',           (SELECT id FROM cats WHERE slug='alimentation'),  14400,  28800,  0,  2,  10)
) AS t(ref, nom, desc_, cat_id, pa, pv, tva, stock, stock_min);

-- Clients
INSERT INTO clients (type, nom, prenom, email, telephone, ville, pays) VALUES
    ('particulier', 'Rakoto',    'Jean',     'jean.rakoto@email.mg',    '+261 34 11 111 11', 'Antananarivo', 'Madagascar'),
    ('particulier', 'Rabe',      'Marie',    'marie.rabe@email.mg',     '+261 34 22 222 22', 'Toamasina',    'Madagascar'),
    ('particulier', 'Randria',   'Paul',     'paul.randria@email.mg',   '+261 34 33 333 33', 'Fianarantsoa', 'Madagascar'),
    ('professionnel',NULL,        NULL,       'contact@techshop.mg',     '+261 20 22 444 44', 'Antananarivo', 'Madagascar'),
    ('particulier', 'Rasoa',     'Hanta',    'hanta.rasoa@email.mg',    '+261 34 55 555 55', 'Antananarivo', 'Madagascar');

UPDATE clients SET raison_sociale = 'NYXON STORE' WHERE email = 'contactnyxon@nyxonstore.com';

