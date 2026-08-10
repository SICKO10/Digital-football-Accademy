-- Autorise la suppression d'un déplacement par le club lui-même, son staff,
-- OU un éducateur affilié accepté — même règle que les policies SELECT/
-- INSERT/UPDATE de supabase_deplacements.sql (PAS "profiles.role IN
-- ('club','admin','educateur')" : cette colonne n'existe pas, la colonne
-- réelle sur profiles s'appelle `plan`, et il n'y a pas de valeur 'admin').
-- Une policy avec une colonne inexistante empêche même la création de la
-- policy (erreur SQL), donc ne corrige rien.
--
-- Version précédente de cette policy : elle omettait la clause
-- club_educateurs, ce qui bloquait la suppression pour les éducateurs
-- (message de permission refusée) alors qu'ils peuvent créer/modifier ces
-- mêmes déplacements. Re-exécuter ce fichier remplace l'ancienne version.

drop policy if exists "delete_deplacements" on deplacements;
drop policy if exists "membres_club_suppression_deplacements" on deplacements;

create policy "membres_club_suppression_deplacements"
  on deplacements for delete
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = deplacements.club_id and sc.user_id = auth.uid())
    or exists (select 1 from club_educateurs ce where ce.club_id = deplacements.club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte')
  );
