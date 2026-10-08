-- Un procédé peut s'adapter à plusieurs tranches d'âge à la fois (ex: un
-- exercice valable U10-U11 ET U12-U13) — categorie_age passe de text (une
-- seule valeur) à text[] (plusieurs valeurs). Les valeurs existantes sont
-- préservées sous forme de tableau à un seul élément.
-- Cf. src/pages/DashboardEducateur.jsx (modale "Nouveau procédé" + modale de
-- sauvegarde rapide), src/components/ScannerProc.jsx (import par photo).
alter table bibliotheque_exercices
  alter column categorie_age drop default;

alter table bibliotheque_exercices
  alter column categorie_age type text[]
  using (case when categorie_age is null then null else array[categorie_age] end);

alter table bibliotheque_exercices
  alter column categorie_age set default array['Pour tous']::text[];
