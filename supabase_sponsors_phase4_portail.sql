-- Sécurisation module Sponsors — PHASE 4 (portail partenaire), additive.
--
-- Problème : get_sponsor_by_token(p_token uuid) (supabase_portail_partenaire.sql)
-- est SECURITY DEFINER, exécutable par anon, et renvoie « setof sponsors » :
-- TOUTES les colonnes de la fiche (notes internes du club, contacts,
-- acces_token, niveau, etc.) à quiconque détient le token.
--
-- Choix : NE PAS supprimer ni recréer get_sponsor_by_token tant que sa
-- définition réelle en production n'est pas validée (V5). Ce fichier crée
-- une NOUVELLE fonction public.sponsor_portail(p_token uuid) qui ne renvoie
-- que ce que PartenairePublic.jsx affiche, puis :
--   1. déployer PartenairePublic.jsx (appelle sponsor_portail) ;
--   2. vérifier le portail ;
--   3. seulement alors, supabase_sponsors_phase4b_portail_retrait.sql retire
--      à anon/authenticated/PUBLIC le droit d'exécuter get_sponsor_by_token
--      (REVOKE EXECUTE, sans DROP : réversible par un simple GRANT).
--
-- Champs renvoyés (= champs lus par PartenairePublic.jsx, vérifiés) :
--   entreprise, date_signature, date_fin, montant_contrat,
--   paiements            -> éléments réduits à { date, mode, montant }
--   contreparties_suivi  -> éléments réduits à { id, label, echeance, statut, preuve_url }
--   documents            -> éléments réduits à { label, url }
--   demande_renouvellement,
--   club_nom, club_avatar_url, club_couleur (depuis profiles du club : le
--   portail n'a plus besoin de lire profiles en anonyme, lecture qui sera
--   bloquée par la future RLS de profiles).
-- Jamais renvoyés : notes, contact_*, acces_token, niveau_id, club_id,
-- afficher_bandeau, lien_url…, et toute clé JSON non listée ci-dessus.
--
-- Dates renvoyées au format JSON standard (to_jsonb(...) #>> '{}'), donc
-- identique à ce que PostgREST renvoyait pour la colonne d'origine.
--
-- Rejouable (marqueur COMMENT ON FUNCTION).
--
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE.

begin;

set local check_function_bodies = on;

-- ─────────────────────────────────────────────────────────────────────────
-- 0. Contrôles préalables.
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  v_manquants text[] := array[]::text[];
  v_attendu record;
  v_type text;
  v_oid regprocedure;
begin
  -- 0a. L'ancienne fonction doit exister avec la signature attendue (elle
  --     n'est PAS modifiée ici ; on vérifie seulement qu'on parle bien de la
  --     même chose que PartenairePublic.jsx).
  if to_regprocedure('public.get_sponsor_by_token(uuid)') is null then
    raise exception 'ARRÊT : public.get_sponsor_by_token(uuid) introuvable — signature réelle différente, à examiner (V5). Rien n''a été créé.';
  end if;

  -- 0b. Colonnes et types.
  for v_attendu in
    select * from (values
      ('sponsors', 'acces_token', array['uuid']),
      ('sponsors', 'club_id', array['uuid']),
      ('sponsors', 'entreprise', array['text', 'varchar', 'bpchar']),
      ('sponsors', 'date_signature', array['date', 'timestamp', 'timestamptz', 'text', 'varchar']),
      ('sponsors', 'date_fin', array['date', 'timestamp', 'timestamptz', 'text', 'varchar']),
      ('sponsors', 'montant_contrat', array['numeric', 'int2', 'int4', 'int8', 'float4', 'float8']),
      ('sponsors', 'paiements', array['jsonb', 'json']),
      ('sponsors', 'contreparties_suivi', array['jsonb', 'json']),
      ('sponsors', 'documents', array['jsonb', 'json']),
      ('sponsors', 'demande_renouvellement', array['bool']),
      ('profiles', 'club', array['text', 'varchar', 'bpchar']),
      ('profiles', 'avatar_url', array['text', 'varchar', 'bpchar']),
      ('profiles', 'couleur_principale', array['text', 'varchar', 'bpchar'])
    ) as t(table_name, column_name, types_admis)
  loop
    select c.udt_name into v_type
    from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = v_attendu.table_name and c.column_name = v_attendu.column_name;
    if v_type is null then
      v_manquants := array_append(v_manquants, format('%s.%s absente', v_attendu.table_name, v_attendu.column_name));
    elsif not (v_type = any(v_attendu.types_admis)) then
      v_manquants := array_append(v_manquants, format('%s.%s de type %s', v_attendu.table_name, v_attendu.column_name, v_type));
    end if;
  end loop;
  if array_length(v_manquants, 1) > 0 then
    raise exception 'ARRÊT phase 4 — schéma différent des hypothèses : %. Rien n''a été créé.', array_to_string(v_manquants, ' ; ');
  end if;

  -- 0c. Anti-écrasement.
  v_oid := to_regprocedure('public.sponsor_portail(uuid)');
  if v_oid is not null
     and coalesce(obj_description(v_oid, 'pg_proc'), '') not like 'digital-football:sponsors-phase4%' then
    raise exception 'ARRÊT : public.sponsor_portail(uuid) existe déjà sans le marqueur de ce fichier. Rien n''a été modifié.';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Fonction du portail : champs strictement nécessaires.
-- Token inconnu => aucune ligne (PartenairePublic affiche « Lien invalide »).
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.sponsor_portail(p_token uuid)
returns table (
  entreprise text,
  date_signature text,
  date_fin text,
  montant_contrat numeric,
  paiements jsonb,
  contreparties_suivi jsonb,
  documents jsonb,
  demande_renouvellement boolean,
  club_nom text,
  club_avatar_url text,
  club_couleur text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.entreprise::text,
    to_jsonb(s.date_signature) #>> '{}',
    to_jsonb(s.date_fin) #>> '{}',
    s.montant_contrat::numeric,
    coalesce((
      select jsonb_agg(
               jsonb_build_object('date', e.v -> 'date', 'mode', e.v -> 'mode', 'montant', e.v -> 'montant')
               order by e.n)
      from jsonb_array_elements(
             case when jsonb_typeof(to_jsonb(s.paiements)) = 'array' then to_jsonb(s.paiements) else '[]'::jsonb end
           ) with ordinality as e(v, n)
      where jsonb_typeof(e.v) = 'object'
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(
               jsonb_build_object('id', e.v -> 'id', 'label', e.v -> 'label', 'echeance', e.v -> 'echeance',
                                  'statut', e.v -> 'statut', 'preuve_url', e.v -> 'preuve_url')
               order by e.n)
      from jsonb_array_elements(
             case when jsonb_typeof(to_jsonb(s.contreparties_suivi)) = 'array' then to_jsonb(s.contreparties_suivi) else '[]'::jsonb end
           ) with ordinality as e(v, n)
      where jsonb_typeof(e.v) = 'object'
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(
               jsonb_build_object('label', e.v -> 'label', 'url', e.v -> 'url')
               order by e.n)
      from jsonb_array_elements(
             case when jsonb_typeof(to_jsonb(s.documents)) = 'array' then to_jsonb(s.documents) else '[]'::jsonb end
           ) with ordinality as e(v, n)
      where jsonb_typeof(e.v) = 'object'
    ), '[]'::jsonb),
    coalesce(s.demande_renouvellement, false),
    p.club::text,
    p.avatar_url::text,
    p.couleur_principale::text
  from public.sponsors s
  left join public.profiles p on p.id = s.club_id
  where p_token is not null
    and s.acces_token = p_token
$$;

comment on function public.sponsor_portail(uuid) is
  'digital-football:sponsors-phase4 — portail partenaire : champs affichés par PartenairePublic uniquement';

-- Portail sans compte (anon) ; authenticated aussi : un visiteur déjà
-- connecté à l'application ouvre le lien avec sa session.
revoke all on function public.sponsor_portail(uuid) from public;
grant execute on function public.sponsor_portail(uuid) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Contrôles.
-- ─────────────────────────────────────────────────────────────────────────
do $$
begin
  if pg_get_function_result('public.sponsor_portail(uuid)'::regprocedure) ilike any (array['%acces_token%', '%notes%', '%contact%', '%club_id%']) then
    raise exception 'ÉCHEC phase 4 : sponsor_portail exposerait une colonne interdite. Transaction annulée.';
  end if;
  if not has_function_privilege('anon', 'public.sponsor_portail(uuid)', 'execute') then
    raise exception 'ÉCHEC phase 4 : anon ne peut pas exécuter sponsor_portail. Transaction annulée.';
  end if;
  raise notice 'Phase 4 portail : contrôles OK (get_sponsor_by_token inchangée)';
end;
$$;

commit;
