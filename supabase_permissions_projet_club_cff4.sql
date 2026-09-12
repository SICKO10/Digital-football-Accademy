-- Étend la matrice de permissions (role_permissions.section) avec la nouvelle
-- section 'projet_club_cff4' — sans ça, sauvegarderPermissions échoue dès
-- qu'un rôle autre que président se voit accorder l'accès à ce nouvel onglet
-- (Projet Club — CFF4, désormais aussi disponible côté Dashboard Club, pas
-- seulement côté éducateur).
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
  check (section in ('sportif', 'terrains', 'deplacements', 'budget', 'sponsors', 'repartition_bus', 'profil', 'evenements', 'organigramme', 'staff', 'inventaire', 'newsletter', 'taches', 'projet_club_cff4'));
