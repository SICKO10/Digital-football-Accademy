-- Autorise la suppression d'un déplacement par le club lui-même ou tout
-- membre de son staff — même règle que toutes les autres policies de ce
-- projet (evenements_club, projets_club, role_permissions...), PAS
-- "profiles.role IN ('club','admin','educateur')" : cette colonne n'existe
-- pas, la colonne réelle sur profiles s'appelle `plan` (valeurs 'club',
-- 'educateur', 'coach', 'joueur_pro', 'recruteur', 'scout', 'dirigeant'),
-- et il n'y a pas de valeur 'admin'. Une policy avec une colonne
-- inexistante empêche même la création de la policy (erreur SQL), donc ne
-- corrige rien.
--
-- Si une ancienne policy DELETE existe déjà sous un autre nom et bloque à
-- tort, adapte le nom ci-dessous après l'avoir identifié dans
-- Supabase → Authentication → Policies (table deplacements).

drop policy if exists "delete_deplacements" on deplacements;

create policy "membres_club_suppression_deplacements"
  on deplacements for delete
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = deplacements.club_id and sc.user_id = auth.uid())
  );
