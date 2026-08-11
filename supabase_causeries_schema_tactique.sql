-- Schéma tactique (placement de joueurs sur demi-terrain, cf. TacticalBoard.jsx)
-- sur une fiche de préparation avant match. Additif uniquement : la table
-- causeries a déjà toutes ses autres colonnes depuis supabase_causeries.sql
-- (celui-ci fait un drop+create complet) — pas besoin de les ré-ajouter ici.
--
-- Si tu obtiens encore "could not find column in schema cache" après avoir
-- exécuté supabase_causeries.sql ET ce fichier, c'est presque toujours le
-- cache PostgREST qui n'a pas encore vu les nouvelles colonnes plutôt qu'un
-- vrai problème de schéma : Supabase → Settings → API → "Reload schema".

alter table causeries add column if not exists schema_tactique jsonb default '[]';
