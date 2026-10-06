-- Ajoute 'seances' à la liste des sections autorisées dans role_permissions.
-- La section "Planifier séance" existe côté UI depuis un moment
-- (DashboardClub.jsx : PERMISSION_SECTIONS) mais n'a jamais été ajoutée à la
-- contrainte, qui ne connaît toujours que les sections d'une version
-- antérieure de la liste — toute tentative d'enregistrer un droit sur cette
-- section échoue donc avec "violates check constraint
-- role_permissions_section_check".
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
  check (section in ('sportif', 'seances', 'terrains', 'deplacements', 'budget', 'sponsors', 'repartition_bus', 'profil', 'evenements', 'organigramme', 'staff', 'inventaire', 'newsletter', 'taches', 'projet_club_cff4'));
