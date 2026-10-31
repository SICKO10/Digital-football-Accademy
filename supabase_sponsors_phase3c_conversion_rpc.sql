-- Sécurisation module Sponsors — PHASE 3c (PROPOSITION, non validée) :
-- conversion prospect -> sponsor atomique et idempotente.
--
-- STATUT : proposition. Non référencée par le JS actuel. GestionSponsors.jsx
-- convertit aujourd'hui en plusieurs requêtes, rendues rejouables sans
-- doublon côté client (relecture, réutilisation d'une fiche orpheline, lien
-- conditionnel sponsor_id IS NULL). Il reste une course possible entre deux
-- conversions VRAIMENT simultanées (deux onglets) : chacune peut créer sa
-- fiche avant que l'une ne pose le lien. Cette fonction la supprime.
--
-- Constat sur le schéma (dépôt) : aucune contrainte n'empêche le doublon —
-- sponsors n'a pas de colonne vers le prospect, pas d'unicité sur
-- (club_id, saison, entreprise), prospects_sponsors.sponsor_id n'est pas
-- unique.
--
-- Principe : une seule transaction —
--   1. droit d'édition vérifié sur le club du prospect (sponsors_peut_acceder) ;
--      prospect inconnu et droit refusé donnent la même erreur (pas de
--      révélation de l'existence d'un prospect d'un autre club) ;
--   2. verrou de la ligne prospect (FOR UPDATE) : une seconde conversion
--      simultanée attend la fin de la première ;
--   3. déjà lié => renvoie le sponsor existant, ne crée rien (idempotence) ;
--   4. sinon crée la fiche ET pose le lien ; tout échec annule les deux.
--
-- Après validation, le JS appellerait supabase.rpc('sponsors_convertir_prospect',
-- { p_prospect_id, p_saison }) à la place des étapes 1 à 3 de
-- convertirEnSponsor (changement JS à faire séparément, après exécution).
--
-- Dépend de : phase 1 révision 2 (sponsors_peut_acceder). Les policies des
-- phases 3/3b ne s'appliquent pas à l'intérieur (SECURITY DEFINER) : le
-- contrôle de droit est fait explicitement en étape 1.
--
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE.

begin;

set local check_function_bodies = on;

do $$
declare
  v_manquants text[] := array[]::text[];
  v_attendu record;
  v_oid regprocedure;
begin
  v_oid := to_regprocedure('public.sponsors_peut_acceder(uuid, boolean)');
  if v_oid is null or coalesce(obj_description(v_oid, 'pg_proc'), '') not like 'digital-football:sponsors-phase1%' then
    raise exception 'ARRÊT : sponsors_peut_acceder (phase 1 révision 2) absente. Rien n''a été créé.';
  end if;

  for v_attendu in
    select * from (values
      ('prospects_sponsors', 'id'), ('prospects_sponsors', 'club_id'), ('prospects_sponsors', 'sponsor_id'),
      ('prospects_sponsors', 'nom_entreprise'), ('prospects_sponsors', 'contact_nom'), ('prospects_sponsors', 'contact_fonction'),
      ('prospects_sponsors', 'contact_email'), ('prospects_sponsors', 'contact_telephone'), ('prospects_sponsors', 'montant_potentiel'),
      ('prospects_sponsors', 'interets'), ('prospects_sponsors', 'updated_at'),
      ('sponsors', 'id'), ('sponsors', 'club_id'), ('sponsors', 'saison'), ('sponsors', 'entreprise'),
      ('sponsors', 'contact_nom'), ('sponsors', 'contact_role'), ('sponsors', 'contact_email'), ('sponsors', 'contact_telephone'),
      ('sponsors', 'montant_contrat'), ('sponsors', 'notes'), ('sponsors', 'paiements')
    ) as t(table_name, column_name)
  loop
    if not exists (select 1 from information_schema.columns c
                   where c.table_schema = 'public' and c.table_name = v_attendu.table_name and c.column_name = v_attendu.column_name) then
      v_manquants := array_append(v_manquants, v_attendu.table_name || '.' || v_attendu.column_name);
    end if;
  end loop;
  if array_length(v_manquants, 1) > 0 then
    raise exception 'ARRÊT phase 3c — colonnes absentes : %. Rien n''a été créé.', array_to_string(v_manquants, ', ');
  end if;

  v_oid := to_regprocedure('public.sponsors_convertir_prospect(uuid, text)');
  if v_oid is not null and coalesce(obj_description(v_oid, 'pg_proc'), '') not like 'digital-football:sponsors-phase3c%' then
    raise exception 'ARRÊT : sponsors_convertir_prospect existe déjà sans le marqueur de ce fichier. Rien n''a été modifié.';
  end if;
end;
$$;

-- Renvoie l'id de la fiche sponsor liée au prospect (créée ou existante).
create or replace function public.sponsors_convertir_prospect(p_prospect_id uuid, p_saison text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_club uuid;
  v_p record;
  v_sponsor uuid;
begin
  if p_prospect_id is null or coalesce(trim(p_saison), '') = '' then
    raise exception 'Paramètres invalides' using errcode = '22023';
  end if;

  -- 1. Droit d'édition (sans verrou : un appelant non autorisé ne bloque rien).
  select p.club_id into v_club from public.prospects_sponsors p where p.id = p_prospect_id;
  if v_club is null or not public.sponsors_peut_acceder(v_club, true) then
    raise exception 'Prospect introuvable ou droits insuffisants' using errcode = '42501';
  end if;

  -- 2. Verrou de la ligne prospect jusqu'à la fin de la transaction.
  select p.id, p.club_id, p.sponsor_id, p.nom_entreprise, p.contact_nom, p.contact_fonction,
         p.contact_email, p.contact_telephone, p.montant_potentiel, p.interets
    into v_p
  from public.prospects_sponsors p
  where p.id = p_prospect_id
  for update;
  if not found or v_p.club_id is distinct from v_club then
    raise exception 'Prospect modifié pendant la conversion, réessaie' using errcode = '40001';
  end if;

  -- 3. Idempotence.
  if v_p.sponsor_id is not null then
    return v_p.sponsor_id;
  end if;

  -- 4. Création + lien, dans la même transaction.
  insert into public.sponsors (club_id, saison, entreprise, contact_nom, contact_role, contact_email,
                               contact_telephone, montant_contrat, notes, paiements)
  values (v_p.club_id, p_saison, v_p.nom_entreprise, v_p.contact_nom, v_p.contact_fonction, v_p.contact_email,
          v_p.contact_telephone, coalesce(v_p.montant_potentiel, 0), v_p.interets, '[]')
  returning id into v_sponsor;

  update public.prospects_sponsors
     set sponsor_id = v_sponsor, updated_at = now()
   where id = p_prospect_id;

  return v_sponsor;
end;
$$;

comment on function public.sponsors_convertir_prospect(uuid, text) is
  'digital-football:sponsors-phase3c — conversion prospect -> sponsor atomique et idempotente (droit d''édition vérifié)';

revoke all on function public.sponsors_convertir_prospect(uuid, text) from public, anon;
grant execute on function public.sponsors_convertir_prospect(uuid, text) to authenticated;

commit;

-- Option complémentaire, NON incluse (à décider après diagnostic) : index
-- unique partiel sur prospects_sponsors(sponsor_id) WHERE sponsor_id IS NOT
-- NULL, pour qu'une même fiche ne puisse jamais être liée à deux prospects.
-- Prérequis : vérifier d'abord qu'aucun doublon n'existe déjà (sinon la
-- création de l'index échoue).
