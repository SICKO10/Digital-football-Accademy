-- Corrige l'erreur "there is no unique or exclusion constraint matching the
-- ON CONFLICT specification" au clic sur "Gérer les permissions" → Sauvegarder
-- (DashboardClub.jsx, sauvegarderPermissions → upsert onConflict 'club_id,role,section').
--
-- Cause : supabase_role_permissions.sql utilise "create table if not exists",
-- qui déclare bien "unique (club_id, role, section)" à la création — mais si
-- la table role_permissions existait déjà avant ce fichier, "if not exists" ne
-- fait rien et la contrainte unique n'est jamais appliquée rétroactivement.
--
-- Ce script ajoute la contrainte manquante si elle n'existe pas déjà (sans
-- jamais dupliquer/écraser si elle est déjà présente).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'role_permissions'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%(club_id, role, section)%'
  ) then
    alter table role_permissions
      add constraint role_permissions_club_role_section_key
      unique (club_id, role, section);
  end if;
end $$;
