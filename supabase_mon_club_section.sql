-- Mon club, bloc 2 : ajoute la section 'mon_club' à la liste des sections que la
-- matrice de droits par rôle (role_permissions.section) accepte.
-- Sans ça, « Enregistrer » dans Mon club > Accès du bureau échoue pour tout le
-- monde (une seule valeur refusée fait échouer l'enregistrement complet).
--
-- À exécuter AVANT de mettre en ligne la nouvelle version du site.
-- Avant : lancer ~/Sauvegardes-DigitalFootball/sauvegarder.sh
--
-- La liste reprend celle de supabase_role_permissions_seances.sql, plus 'stages'
-- (présent dans la matrice côté écran) et 'mon_club'. Elle ne retire rien : les
-- lignes déjà enregistrées restent valides. Aucune ligne n'est créée ni modifiée
-- (sans ligne, seul le président a accès à Mon club).
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
  check (section in ('sportif', 'seances', 'terrains', 'deplacements', 'budget', 'sponsors', 'repartition_bus', 'profil', 'evenements', 'stages', 'organigramme', 'staff', 'inventaire', 'newsletter', 'taches', 'projet_club_cff4', 'mon_club'));

-- Contrôle (lecture seule) : doit montrer UNE contrainte, qui contient 'mon_club'.
select conname, pg_get_constraintdef(oid) as regle
from pg_constraint
where conrelid = 'role_permissions'::regclass and contype = 'c' and conname = 'role_permissions_section_check';
