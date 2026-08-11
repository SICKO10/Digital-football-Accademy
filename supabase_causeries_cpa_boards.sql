-- Boards CPA offensif/défensif (TacticalBoard V2 : joueurs + ballon + flèches)
-- sur la fiche de préparation avant match. Additif uniquement, comme
-- supabase_causeries_schema_tactique.sql — la table causeries a déjà toutes
-- ses autres colonnes depuis supabase_causeries.sql.
--
-- TacticalBoard V2 remplace entièrement la V1 (qui ne gérait que des
-- joueurs) et introduit un format d'objet {joueurs, ballon, fleches} pour
-- tous ses usages, y compris schema_tactique (section "Schéma tactique")
-- qui utilisait jusqu'ici un simple tableau de joueurs : mise à jour du
-- défaut de colonne en conséquence. Aucune fiche réelle n'existe encore
-- avec l'ancien format (fonctionnalité ajoutée il y a quelques minutes
-- dans ce même projet), donc aucune migration de données n'est nécessaire.

alter table causeries
  add column if not exists schema_cpa_offensif jsonb default '{"joueurs":[],"ballon":null,"fleches":[]}',
  add column if not exists schema_cpa_defensif jsonb default '{"joueurs":[],"ballon":null,"fleches":[]}';

alter table causeries
  alter column schema_tactique set default '{"joueurs":[],"ballon":null,"fleches":[]}';
