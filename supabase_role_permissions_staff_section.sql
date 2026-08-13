-- Ajoute 'staff' à la liste des sections pilotables par la matrice de
-- permissions (role_permissions.section), pour que "Staff" (gestion du staff
-- du club : ajout/invitation/retrait de membres) devienne délégable comme les
-- autres sections administratives, au lieu d'être verrouillé en dur sur le
-- président (cf. DashboardClub.jsx : PERMISSION_SECTIONS, canViewSection('staff'),
-- canEditSection('staff')).
--
-- Note : la modale "Gérer les permissions" elle-même reste réservée au
-- président (front + RLS existante sur role_permissions), qu'un rôle délégué
-- ait ou non can_edit sur 'staff' — un rôle délégué peut donc ajouter/inviter/
-- retirer des membres du staff, mais jamais reconfigurer qui a quel droit.
do $$
declare
  c record;
begin
  for c in
    select conname, conrelid::regclass::text as tbl
    from pg_constraint
    where conrelid = 'role_permissions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%section%sportif%'
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
  end loop;
end $$;

alter table role_permissions
  add constraint role_permissions_section_check
  check (section in ('sportif', 'terrains', 'deplacements', 'budget', 'sponsors', 'repartition_bus', 'profil', 'evenements', 'organigramme', 'staff'));
