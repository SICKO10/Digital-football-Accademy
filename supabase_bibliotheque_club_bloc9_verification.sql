-- ============================================================================
-- Bibliothèque du club, bloc 9 : VÉRIFICATIONS (lecture seule)
-- Lancé par Claude AVANT puis APRÈS supabase_bibliotheque_club_bloc9.sql :
--   supabase db query --linked -f supabase_bibliotheque_club_bloc9_verification.sql --output-format json
-- Ne modifie aucune donnée. Les comptes sont simulés en lecture (rôle
-- authenticated + identifiant), donc avec les vraies règles RLS de la production.
-- Avant le SQL du bloc, les lignes « structure » sont fausses : c'est normal.
-- ============================================================================

create temp table verif (ordre int, controle text, attendu text, obtenu text);
grant insert, select on verif to authenticated;

-- --- Structure (après le bloc) ------------------------------------------------
insert into verif
select 1, 'règles des procédés : 6 d''avant + 1 ajoutée',
       'ecriture_exercices,lecture_exercices,lecture_exercices_df_club,lecture_exercices_partage_club_direction,modif_exercices,suppr_exercices,verrou_outils',
       (select string_agg(policyname, ',' order by policyname) from pg_policies
         where schemaname = 'public' and tablename = 'bibliotheque_exercices')
union all
select 2, 'règle ajoutée : lecture seule, comptes connectés', 'SELECT:{authenticated}',
       (select cmd || ':' || roles::text from pg_policies
         where schemaname = 'public' and tablename = 'bibliotheque_exercices'
           and policyname = 'lecture_exercices_partage_club_direction')
union all
select 3, 'fonctions protégées (security definer, search_path vide)',
       'bibliotheque_club_procedes_avant_ecriture,secu_club_lit_partage_educateur',
       (select string_agg(proname, ',' order by proname) from pg_proc
         where pronamespace = 'public'::regnamespace and prosecdef and proconfig @> array['search_path=""']
           and proname in ('secu_club_lit_partage_educateur', 'bibliotheque_club_procedes_avant_ecriture'))
union all
select 4, 'aucune exécution pour les visiteurs anonymes', 'false',
       (select coalesce(bool_or(has_function_privilege('anon', p.oid, 'execute')), false)::text from pg_proc p
         where p.pronamespace = 'public'::regnamespace
           and p.proname in ('secu_club_lit_partage_educateur', 'bibliotheque_club_procedes_avant_ecriture'))
union all
select 5, 'déclencheur : contrôle de l''adoption présent', 'true',
       (select (prosrc like '%origine = ''educateur''%' and prosrc like '%secu_club_lit_partage_educateur%')::text
          from pg_proc where proname = 'bibliotheque_club_procedes_avant_ecriture')
union all
select 6, 'déclencheur toujours branché sur la table', 'bibliotheque_club_procedes_avant_ecriture',
       (select string_agg(tgname, ',') from pg_trigger
         where tgrelid = 'public.bibliotheque_club_procedes'::regclass and not tgisinternal)
union all
select 7, 'données inchangées : procédés total / partagés club / partagés DF', '69/49/41',
       (select count(*) || '/' || count(*) filter (where partage_club) || '/' || count(*) filter (where partage_platform)
          from public.bibliotheque_exercices)
union all
select 8, 'données inchangées : procédés du club / adoptés', '0/0',
       (select count(*) || '/' || count(*) filter (where origine = 'educateur') from public.bibliotheque_club_procedes);

-- --- Ce que chaque compte peut LIRE (vraies règles RLS) ----------------------
-- Résultat : procédés partagés au club SEULEMENT (pas à Digital Football,
--            sinon déjà lisibles par tous les clubs) d'autres personnes visibles /
--            procédés PERSONNELS (ni club ni DF) d'autres personnes visibles.
-- Le second chiffre doit rester 0 pour tout le monde.
-- Les « attendu » sont ceux d'APRÈS le bloc.

create temp table comptes (ordre int, qui text, sub text, attendu text);
insert into comptes values
  -- avant : 0/0 ; après : lit les 7 procédés partagés au club seulement par ses éducateurs acceptés
  (20, 'compte club A (af8db5d3)',            'af8db5d3-ea32-4d9b-b5bf-fb6062505826', '7/0'),
  -- 21 et 23 sont aussi éducateurs acceptés du club A : ils lisaient déjà les 7 (photo avant 7/0, inchangé)
  (21, 'directeur sportif club A',            '650a1893-c3dc-4983-b823-f4bbdf4bd8a9', '7/0'),
  (22, 'directeur sportif club B',            'ba8559e9-4aab-40d6-9d33-3a22daac07b2', '0/0'),
  (23, 'éducateur accepté club A',            'f99b69d4-bc88-4c4d-875b-bba253bcdc11', '7/0'),
  -- 24 : lecture Bibliothèque seulement (pas l'écriture), autre club
  (24, 'préparateur physique (club 11f0a171)', '9e67e075-bc8c-433a-9757-e25f9d8514ce', '0/0'),
  (25, 'administrateur Digital Football',     '6bb9ff95-23a6-4e12-84db-f84d26a24172', '0/0'),
  (26, 'un joueur affilié',                   (select joueur_id::text from public.affiliations where statut = 'accepte' order by joueur_id limit 1), '0/0'),
  (27, 'un autre compte club',                '0e341547-f2de-4ac2-9229-4a2b2711652b', '0/0');
grant select on comptes to authenticated;

do $$
declare c record;
begin
  for c in select * from comptes order by ordre loop
    perform set_config('request.jwt.claim.sub', coalesce(c.sub, ''), true);
    execute 'set local role authenticated';
    insert into verif
    select c.ordre, 'lecture : ' || c.qui, c.attendu,
           (select count(*) from public.bibliotheque_exercices
             where partage_club and not coalesce(partage_platform, false)
               and educateur_id::text <> c.sub)::text || '/' ||
           (select count(*) from public.bibliotheque_exercices
             where not coalesce(partage_club, false) and not coalesce(partage_platform, false)
               and educateur_id::text <> c.sub)::text;
    execute 'reset role';
  end loop;
end $$;

-- --- Résultat ---------------------------------------------------------------
select ordre, controle, attendu, obtenu, (attendu = obtenu) as ok from verif order by ordre;
