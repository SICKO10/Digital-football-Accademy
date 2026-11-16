-- ============================================================================
-- Bibliothèque du club, bloc 5 : VÉRIFICATIONS (lecture seule)
-- Lancé par Claude AVANT puis APRÈS supabase_bibliotheque_club_bloc5.sql :
--   supabase db query --linked -f supabase_bibliotheque_club_bloc5_verification.sql --output-format json
-- Ne modifie aucune donnée : aucun ajout, aucune modification, aucune suppression.
-- Les comptes sont simulés en lecture (rôle authenticated + identifiant), donc
-- avec les vraies règles RLS de la production.
-- Avant le SQL du bloc, les lignes « structure » sont fausses : c'est normal.
-- ============================================================================

create temp table verif (ordre int, controle text, attendu text, obtenu text);
grant insert, select on verif to authenticated;

-- --- Structure (après le bloc) ------------------------------------------------
insert into verif
select 1, 'règles vidéos : 4, réservées aux comptes connectés',
       'bv_delete:DELETE:{authenticated},bv_insert:INSERT:{authenticated},bv_select:SELECT:{authenticated},bv_update:UPDATE:{authenticated}',
       (select string_agg(policyname || ':' || cmd || ':' || roles::text, ',' order by policyname)
          from pg_policies where schemaname = 'public' and tablename = 'bibliotheque_videos')
union all
select 2, 'plus aucune règle vidéo « tout compte connecté »', '0',
       (select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'bibliotheque_videos'
          and coalesce(qual, with_check) = '(auth.uid() IS NOT NULL)')
union all
select 3, 'règle de lecture DF ajoutée sur les procédés', 'lecture_exercices_df_club:SELECT:{authenticated}',
       (select string_agg(policyname || ':' || cmd || ':' || roles::text, ',') from pg_policies
         where schemaname = 'public' and tablename = 'bibliotheque_exercices' and policyname = 'lecture_exercices_df_club')
union all
select 4, 'règles existantes des procédés intactes (5 + 1 ajoutée)',
       'ecriture_exercices,lecture_exercices,lecture_exercices_df_club,modif_exercices,suppr_exercices,verrou_outils',
       (select string_agg(policyname, ',' order by policyname) from pg_policies
         where schemaname = 'public' and tablename = 'bibliotheque_exercices')
union all
select 5, 'fonctions protégées (security definer, search_path vide)',
       'bibliotheque_videos_portee_figee,secu_joueur_affilie,secu_lit_bibliotheque_df',
       (select string_agg(proname, ',' order by proname) from pg_proc
         where pronamespace = 'public'::regnamespace and prosecdef and proconfig @> array['search_path=""']
           and proname in ('secu_lit_bibliotheque_df', 'secu_joueur_affilie', 'bibliotheque_videos_portee_figee'))
union all
select 6, 'aucune exécution pour les visiteurs anonymes', 'false',
       (select coalesce(bool_or(has_function_privilege('anon', p.oid, 'execute')), false)::text from pg_proc p
         where p.pronamespace = 'public'::regnamespace
           and p.proname in ('secu_lit_bibliotheque_df', 'secu_joueur_affilie', 'bibliotheque_videos_portee_figee'))
union all
select 7, 'déclencheur type/club/propriétaire figés', 'bibliotheque_videos_portee_figee',
       (select string_agg(tgname, ',') from pg_trigger
         where tgrelid = 'public.bibliotheque_videos'::regclass and not tgisinternal)
union all
select 8, 'données inchangées : vidéos df / club / perso', '39/0/0',
       (select count(*) filter (where type = 'df') || '/' || count(*) filter (where type = 'club') || '/' || count(*) filter (where type = 'perso')
          from public.bibliotheque_videos)
union all
select 9, 'données inchangées : procédés (total / partagés DF)', '69/41',
       (select count(*) || '/' || count(*) filter (where partage_platform) from public.bibliotheque_exercices);

-- --- Ce que chaque compte peut LIRE (vraies règles RLS) ----------------------
-- Résultat : vidéos visibles / procédés DF visibles / procédés NON partagés DF
-- d'autres personnes visibles (ce dernier chiffre ne doit pas bouger avant/après).
-- Les « attendu » sont ceux d'APRÈS le bloc.

create temp table comptes (ordre int, qui text, sub text, attendu text);
insert into comptes values
  (20, 'compte club A (af8db5d3)',           'af8db5d3-ea32-4d9b-b5bf-fb6062505826', '39/41/0'),
  -- 21 et 23 sont aussi éducateurs acceptés du club A : ils lisent déjà les
  -- 41 procédés DF et 7 procédés partagés au club (photo avant : 39/41/7).
  (21, 'directeur sportif club A',           '650a1893-c3dc-4983-b823-f4bbdf4bd8a9', '39/41/7'),
  (22, 'directeur sportif club B',           'ba8559e9-4aab-40d6-9d33-3a22daac07b2', '39/41/0'),
  (23, 'éducateur accepté club A',           'f99b69d4-bc88-4c4d-875b-bba253bcdc11', '39/41/7'),
  -- 24 : avant 39/0/0 ; lit maintenant DF grâce à la lecture Bibliothèque par défaut.
  (24, 'préparateur physique (club 11f0a171)','9e67e075-bc8c-433a-9757-e25f9d8514ce', '39/41/0'),
  -- 25 : son profil est de type 'club' : lit DF comme tout compte club (avant 39/0/0).
  (25, 'administrateur Digital Football',    (select user_id::text from public.admins_coach order by user_id limit 1), '39/41/0'),
  (26, 'un joueur affilié',                  (select joueur_id::text from public.affiliations where statut = 'accepte' order by joueur_id limit 1), '39/0/0'),
  (27, 'un compte club sans staff ni autre lien', (select p.id::text from public.profiles p where p.plan = 'club'
                                               and p.id <> 'af8db5d3-ea32-4d9b-b5bf-fb6062505826' order by p.id limit 1), '39/41/0');
grant select on comptes to authenticated;

do $$
declare c record;
begin
  for c in select * from comptes order by ordre loop
    perform set_config('request.jwt.claim.sub', coalesce(c.sub, ''), true);
    execute 'set local role authenticated';
    insert into verif
    select c.ordre, 'lecture : ' || c.qui, coalesce(c.attendu, '(voir avant/après)'),
           (select count(*) from public.bibliotheque_videos)::text || '/' ||
           (select count(*) from public.bibliotheque_exercices where partage_platform)::text || '/' ||
           (select count(*) from public.bibliotheque_exercices
             where not coalesce(partage_platform, false) and educateur_id::text <> c.sub)::text;
    execute 'reset role';
  end loop;
end $$;

-- --- Ce que chaque compte peut ÉCRIRE (mêmes fonctions que les règles) -------
-- Vérifié sans rien écrire : on évalue les conditions des règles d'écriture.
-- Colonnes : vidéo club A / vidéo club B / vidéo Digital Football.
do $$
declare c record;
begin
  for c in select * from comptes where ordre in (20, 21, 22, 23, 24, 25) order by ordre loop
    perform set_config('request.jwt.claim.sub', coalesce(c.sub, ''), true);
    insert into verif
    select c.ordre + 20, 'écriture : ' || c.qui,
           case c.ordre when 20 then 'oui/non/non' when 21 then 'oui/non/non' when 22 then 'non/oui/non'
                        when 23 then 'non/non/non' when 24 then 'non/non/non' when 25 then 'non/non/oui' end,
           (case when public.a_permission_bibliotheque('af8db5d3-ea32-4d9b-b5bf-fb6062505826', true) then 'oui' else 'non' end) || '/' ||
           (case when public.a_permission_bibliotheque('adf4b030-c08e-44c3-a2d5-a0fe39405209', true) then 'oui' else 'non' end) || '/' ||
           (case when public.est_admin_coach() then 'oui' else 'non' end);
  end loop;
end $$;

-- --- Résultat ---------------------------------------------------------------
select ordre, controle, attendu, obtenu, (attendu = obtenu) as ok from verif order by ordre;
