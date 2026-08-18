-- Ajoute Responsable Arbitre à la liste des rôles staff autorisés sur
-- staff_club et role_permissions (complète, ne remplace pas, les rôles
-- existants). Ajoute aussi responsable_equipements au passage : déjà présent
-- dans ROLES_STAFF côté front mais jamais ajouté à la contrainte CHECK
-- jusqu'ici (aucun fichier supabase_*.sql ne le référençait).
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
    'responsable_formation', 'responsable_ecole_foot', 'responsable_preformation', 'entraineur', 'educateur', 'tresorier', 'responsable_communication',
    'responsable_buvette', 'responsable_securite', 'responsable_equipements', 'responsable_arbitre'
  ));

alter table role_permissions
  add constraint role_permissions_role_check
  check (role in (
    'president', 'directeur_sportif', 'marketing', 'secretaire', 'coach_adjoint', 'kine', 'intendant', 'preparateur_physique', 'comptable',
    'responsable_formation', 'responsable_ecole_foot', 'responsable_preformation', 'entraineur', 'educateur', 'tresorier', 'responsable_communication',
    'responsable_buvette', 'responsable_securite', 'responsable_equipements', 'responsable_arbitre'
  ));
