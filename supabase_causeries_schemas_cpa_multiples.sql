-- Plusieurs schémas CPA (TacticalBoard) par causerie, offensifs comme
-- défensifs — jusqu'ici une seule animation possible par type (colonnes
-- schema_cpa_offensif/schema_cpa_defensif, un seul objet {etapes:[...]}).
-- schemas_cpa_offensif/defensif est un TABLEAU de { nom, etapes } : plusieurs
-- corners/coups francs/CPA différents peuvent coexister, chacun avec son
-- propre nom et sa propre animation multi-étapes.
--
-- Additif uniquement : les anciennes colonnes schema_cpa_offensif/defensif
-- restent en base (pas de perte de données) — CauserieAvantMatch.jsx les lit
-- encore une fois, pour convertir automatiquement l'ancien schéma unique en
-- premier élément du nouveau tableau à l'ouverture d'une fiche existante.

alter table causeries add column if not exists schemas_cpa_offensif jsonb not null default '[]';
alter table causeries add column if not exists schemas_cpa_defensif jsonb not null default '[]';
