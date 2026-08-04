-- Étend la liste des rôles de staff autorisés avec 5 rôles supplémentaires
-- (Coach adjoint, Kinésithérapeute, Intendant, Préparateur physique, Comptable),
-- en plus des 4 rôles existants (Président, Directeur sportif, Marketing,
-- Secrétaire). Par défaut ces nouveaux rôles n'ont accès à aucune section tant
-- que le président ne leur en accorde pas explicitement via "Staff → Gérer les
-- permissions" (cf. PERMISSION_DEFAULTS côté front, qui ne les liste nulle
-- part — comportement volontaire, principe du moindre privilège).
--
-- Recherche dynamiquement le nom de la contrainte CHECK existante sur
-- staff_club.role / role_permissions.role (auto-généré par Postgres, on ne
-- suppose pas son nom) plutôt que de le deviner.
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
  check (role in ('president', 'directeur_sportif', 'marketing', 'secretaire', 'coach_adjoint', 'kine', 'intendant', 'preparateur_physique', 'comptable'));

alter table role_permissions
  add constraint role_permissions_role_check
  check (role in ('president', 'directeur_sportif', 'marketing', 'secretaire', 'coach_adjoint', 'kine', 'intendant', 'preparateur_physique', 'comptable'));
