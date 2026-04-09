# Schéma PostgreSQL — Boutique + Stock

## Structure (14 modules)

| Module | Tables | Description |
|--------|--------|-------------|
| Auth | `users`, `refresh_tokens` | JWT, rôles (superadmin/admin/manager/vendeur/lecteur) |
| Catalogue | `marques`, `categories`, `fournisseurs` | Hiérarchie catégories, arborescence |
| Produits | `produits`, `produit_variantes` | Prix HT/TTC auto-calculé, stock minimum |
| Clients | `clients` | Particuliers et professionnels |
| Commandes | `commandes`, `commande_lignes`, `commande_historique` | 7 statuts, précommandes, acomptes |
| Stock | `stock_mouvements`, `inventaires`, `inventaire_lignes` | Journal complet, écart inventaire calculé |
| Reçus | `recus` | Snapshot JSON + export JPEG |
| Ads | `ads_campagnes`, `ads_depenses_quotidiennes` | FB/IG, ROAS et CPC auto-calculés |
| KPIs | `kpi_journalier`, `kpi_top_produits`, `kpi_top_clients` | Snapshots nuit |
| Prévisions | `previsions_ventes` | Régression linéaire par produit |
| Config | `config_boutique` | Paramètres boutique (devise, prefix, etc.) |

## Vues disponibles
- `v_produits_complets` — Produits + marque + catégorie + état stock + taux marge
- `v_commandes_detail` — Commandes + client + vendeur
- `v_kpi_temps_reel` — Dashboard KPIs instantanés (sans calcul)
- `v_valeur_stock` — Valeur stock par catégorie

## Triggers automatiques
- `updated_at` sur toutes les tables principales
- Numérotation `CMD-YYYY-XXXXXX` et `REC-YYYY-XXXXXX`
- Mise à jour `stock_actuel` après chaque mouvement
- Mise à jour stats client (`nb_commandes`, `ca_total`) à la livraison

## Champs calculés (GENERATED ALWAYS AS STORED)
- `prix_vente_ttc` = prix_vente_ht × (1 + tva/100)
- `ecart` inventaire = stock_reel - stock_theorique
- `cpc` campagne = depense / clics
- `roas` campagne = revenus / depense

## Installation
```bash
psql -U postgres -c "CREATE DATABASE boutique_db;"
psql -U postgres -d boutique_db -f migrations/001_schema_complet.sql
psql -U postgres -d boutique_db -f migrations/002_seed_data.sql
```

```
CREATE DATABASE nyxon_db
  ENCODING 'UTF8'
  LC_COLLATE 'French_France.1252'
  LC_CTYPE 'French_France.1252';

CREATE USER nyxon_admin WITH PASSWORD 'nyxon@2026!';
GRANT ALL PRIVILEGES ON DATABASE nyxon_db TO nyxon_admin;
ALTER DATABASE nyxon_db OWNER TO nyxon_admin;
```