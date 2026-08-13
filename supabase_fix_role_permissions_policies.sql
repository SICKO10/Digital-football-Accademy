-- Corrige "new row violates row-level security policy for table role_permissions"
-- à la sauvegarde de la matrice de permissions.
--
-- Cause probable : role_permissions préexistait à supabase_role_permissions.sql
-- (même cause que le fix précédent sur la contrainte unique manquante — la
-- table existait déjà, donc "create table if not exists" ne l'a pas créée
-- avec sa configuration). Si une policy du même nom existait déjà dans un état
-- différent (ou RLS était activée sans policy d'écriture), le "create policy"
-- de ce script a pu échouer et interrompre le reste du fichier, laissant la
-- table avec RLS activée mais aucune policy d'écriture fonctionnelle — d'où
-- le refus systématique (RLS refuse par défaut si aucune policy ne matche).
--
-- Ce script recrée les 4 policies de façon idempotente (drop puis create),
-- avec exactement la même logique que supabase_role_permissions.sql : le club
-- lui-même + tout son staff en lecture, le club lui-même + le président
-- uniquement en écriture.
alter table role_permissions enable row level security;

drop policy if exists "membres_club_lecture_permissions" on role_permissions;
drop policy if exists "president_insertion_permissions" on role_permissions;
drop policy if exists "president_maj_permissions" on role_permissions;
drop policy if exists "president_suppression_permissions" on role_permissions;

create policy "membres_club_lecture_permissions"
  on role_permissions for select
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = role_permissions.club_id and sc.user_id = auth.uid())
  );

create policy "president_insertion_permissions"
  on role_permissions for insert
  with check (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = role_permissions.club_id and sc.user_id = auth.uid() and sc.role = 'president')
  );

create policy "president_maj_permissions"
  on role_permissions for update
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = role_permissions.club_id and sc.user_id = auth.uid() and sc.role = 'president')
  );

create policy "president_suppression_permissions"
  on role_permissions for delete
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = role_permissions.club_id and sc.user_id = auth.uid() and sc.role = 'president')
  );

grant select, insert, update, delete on role_permissions to authenticated;
