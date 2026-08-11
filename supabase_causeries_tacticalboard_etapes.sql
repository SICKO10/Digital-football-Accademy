-- TacticalBoard V3 : les boards CPA passent d'un format {joueurs, ballon,
-- fleches} à un format multi-étapes {etapes:[{joueurs,ballon}, ...]}. Une
-- étape est un instantané des positions ; "+ Étape" clone l'étape en cours
-- pour que l'éducateur déplace joueurs/ballon vers leur position suivante,
-- et "Animer" fait réellement glisser les jetons d'une étape à l'autre —
-- un vrai jeu en mouvement plutôt que de simples flèches statiques.
--
-- Additif uniquement : met à jour le défaut des 2 colonnes existantes,
-- aucune fiche réelle n'existe encore avec l'ancien format.
--
-- La section "Schéma tactique" (pleine page, hors CPA) est retirée de
-- l'interface à cette étape. La colonne schema_tactique reste en base sans
-- dommage, elle n'est simplement plus lue ni écrite par l'application.

alter table causeries
  alter column schema_cpa_offensif set default '{"etapes":[{"joueurs":[],"ballon":null}]}',
  alter column schema_cpa_defensif set default '{"etapes":[{"joueurs":[],"ballon":null}]}';
