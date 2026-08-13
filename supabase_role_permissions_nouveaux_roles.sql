-- Ajoute les nouveaux rôles staff spécifiques football (Responsable Formation,
-- Responsable École de Foot, Responsable Préformation, Entraîneur, Éducateur,
-- Trésorier, Responsable Communication) à la liste des rôles autorisés sur
-- staff_club et role_permissions. Complète (ne remplace pas) les rôles
-- existants (président, directeur sportif, marketing, secrétaire, coach
-- adjoint, kiné, intendant, préparateur physique, comptable) pour ne pas
-- casser les clubs déjà en production avec ces rôles-là.
do $$
declare
  c record;
begin
  for c in
    select conname, conrelid::regclass::text as tbl
    from pg_constraint
    where conrelid in ('staff_club'::regclass, 'role_permissions'::regclass)
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%president%'
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
  end loop;
end $$;

alter table staff_club
  add constraint staff_club_role_check
  check (role in (
    'president', 'directeur_sportif', 'marketing', 'secretaire', 'coach_adjoint', 'kine', 'intendant', 'preparateur_physique', 'comptable',
    'responsable_formation', 'responsable_ecole_foot', 'responsable_preformation', 'entraineur', 'educateur', 'tresorier', 'responsable_communication'
  ));

alter table role_permissions
  add constraint role_permissions_role_check
  check (role in (
    'president', 'directeur_sportif', 'marketing', 'secretaire', 'coach_adjoint', 'kine', 'intendant', 'preparateur_physique', 'comptable',
    'responsable_formation', 'responsable_ecole_foot', 'responsable_preformation', 'entraineur', 'educateur', 'tresorier', 'responsable_communication'
  ));

-- Même liste de rôles pour role_categories_access (créée à part, cf.
-- supabase_role_categories_access.sql — pas de check constraint sur role à ce
-- stade, cohérence assurée côté front par ROLES_STAFF).
