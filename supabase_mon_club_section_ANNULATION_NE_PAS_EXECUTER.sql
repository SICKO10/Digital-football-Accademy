-- ANNULATION de supabase_mon_club_section.sql : NE PAS EXÉCUTER sans en parler.
-- Retire 'mon_club' de la liste. À ne faire qu'après avoir vérifié qu'aucune ligne
-- role_permissions n'a section = 'mon_club' (sinon la contrainte est refusée) :
--   select count(*) from role_permissions where section = 'mon_club';
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
  check (section in ('sportif', 'seances', 'terrains', 'deplacements', 'budget', 'sponsors', 'repartition_bus', 'profil', 'evenements', 'stages', 'organigramme', 'staff', 'inventaire', 'newsletter', 'taches', 'projet_club_cff4'));
