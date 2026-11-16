-- Chantier sécurité de novembre — TESTS SQL (aucun effet durable).
--
-- À lancer dans le SQL Editor de Supabase, fichier entier. Le résultat est
-- un tableau : une ligne par case de la matrice (PLAN-securite-novembre.md).
--
-- Comment c'est sans risque :
--   - chaque cas tourne dans une sous-transaction toujours annulée : les
--     séances, convocations et lignes de staff créées pour le test, et toute
--     écriture tentée par un acteur, disparaissent aussitôt ;
--   - l'acteur est simulé comme dans l'application : identité dans
--     request.jwt.claims + rôle authenticated (ou anon pour le visiteur) ;
--   - seuls des objets temporaires de la session sont créés (pg_temp).
--
-- Lecture du tableau :
--   - section F (fonctions) : tout doit être « ok » dès le bloc 2 ;
--   - section T (tables) : « ok » si la base répond déjà comme la matrice,
--     sinon « écart, fermé au bloc N » : normal tant que ce bloc n'est pas
--     appliqué. Pour un bloc listé dans t.blocs_appliques (fixtures
--     ci-dessous), tout écart devient « ÉCHEC ». Après le bloc 9, tout doit
--     être « ok » ;
--   - « ÉCHEC » : ne doit jamais apparaître.
--
-- Club A = club test (deabreu.amorim+club@), club B = AS CANNES (lecture
-- seule : aucune écriture réelle, uniquement des tentatives annulées).

-- ═════════════════════════════════════════════════════════════════════════
-- FIXTURES : vrais identifiants (lus en base le 2026-11-16)
-- ═════════════════════════════════════════════════════════════════════════
select
  set_config('t.club_a',        '0e341547-f2de-4ac2-9229-4a2b2711652b', false), -- club test
  set_config('t.educ_a',        '75df7fba-40e1-4c93-8902-91d7239c404c', false), -- testfinal@, éducateur accepté de A
  set_config('t.equipe_a',      'b0a55bd8-3dbe-44fc-a41c-ada73aec89ee', false), -- U13 A de testfinal
  set_config('t.staff_a',       'a011f381-88c4-4799-a05b-aea76d527052', false), -- directeur sportif de A, limité à U11
  set_config('t.staff_a_ligne', '16646308-fef9-445f-994e-6ffb86355ab3', false), -- sa ligne staff_club
  set_config('t.joueur_a',      '5e9dc7a1-7f35-4f55-87da-8c63ed60b703', false), -- joueur affilié à testfinal
  set_config('t.parent_a',      '1981ced9-3814-4dcd-a3d1-ed168b0101bf', false), -- parent accepté du joueur
  set_config('t.dirigeant_a',   'd857dd06-f13c-4e5f-a435-2b3d6396e5e3', false), -- dirigeant de testfinal (entraînements édition, compétition lecture)
  set_config('t.dirigeant_ligne','a8e84afb-4060-4f29-a937-44df6c7e3429', false), -- sa ligne dirigeant_acces
  set_config('t.club_b',        'af8db5d3-ea32-4d9b-b5bf-fb6062505826', false), -- AS CANNES
  set_config('t.educ_b',        '9f30757b-0125-4206-8218-22d8743d9029', false), -- éducateur accepté et directeur sportif de B
  set_config('t.equipe_b',      '00f2fab3-5ca5-4687-a440-bd54fcb1d5b3', false), -- U10 A de educ_b
  set_config('t.staff_b_ligne', '987adf17-4649-4009-975d-37fecbda762f', false), -- une ligne staff_club de B
  set_config('t.externe',       '19b17e6c-77e9-48fd-a4ee-b17d590be499', false), -- éducateur sans aucun lien avec A ni B
  set_config('t.anon',          '00000000-0000-0000-0000-000000000000', false), -- visiteur sans compte (rôle anon)
  -- blocs de fermeture déjà appliqués en production (à compléter à chaque bloc)
  set_config('t.blocs_appliques', '2,3,5', false),
  -- identifiants des lignes créées pour les tests (annulées à chaque cas)
  set_config('t.fx_seance_a',   gen_random_uuid()::text, false),
  set_config('t.fx_seance_a0',  gen_random_uuid()::text, false),
  set_config('t.fx_seance_b',   gen_random_uuid()::text, false),
  set_config('t.fx_seance_ba',  gen_random_uuid()::text, false),
  set_config('t.fx_conv_a',     gen_random_uuid()::text, false),
  set_config('t.fx_conv_b',     gen_random_uuid()::text, false),
  set_config('t.fx_cj_a',       gen_random_uuid()::text, false),
  set_config('t.fx_cj_b',       gen_random_uuid()::text, false),
  set_config('t.fx_joueur_b',   gen_random_uuid()::text, false),
  set_config('t.fx_staff_col',  gen_random_uuid()::text, false);

-- F0. Les fixtures correspondent toujours à la base (sinon arrêt, rien n'est testé).
do $$
begin
  if not exists (select 1 from public.profiles where id = current_setting('t.club_a')::uuid and plan = 'club')
     or not exists (select 1 from public.profiles where id = current_setting('t.club_b')::uuid and plan = 'club') then
    raise exception 'F0 : club A ou club B introuvable (plan club). Tests arrêtés.';
  end if;
  if not exists (select 1 from public.club_educateurs where club_id = current_setting('t.club_a')::uuid and educateur_id = current_setting('t.educ_a')::uuid and statut = 'accepte')
     or not exists (select 1 from public.club_categories where id = current_setting('t.equipe_a')::uuid and club_id = current_setting('t.club_a')::uuid and educateur_id = current_setting('t.educ_a')::uuid) then
    raise exception 'F0 : educ_a ou equipe_a ne correspond plus au club A. Tests arrêtés.';
  end if;
  if not exists (select 1 from public.staff_club where id = current_setting('t.staff_a_ligne')::uuid and club_id = current_setting('t.club_a')::uuid and user_id = current_setting('t.staff_a')::uuid and role = 'directeur_sportif') then
    raise exception 'F0 : staff_a n''est plus directeur sportif du club A. Tests arrêtés.';
  end if;
  if not exists (select 1 from public.affiliations where joueur_id = current_setting('t.joueur_a')::uuid and educateur_id = current_setting('t.educ_a')::uuid and statut = 'accepte')
     or not exists (select 1 from public.parents_acces where parent_id = current_setting('t.parent_a')::uuid and joueur_id = current_setting('t.joueur_a')::uuid and statut = 'accepte') then
    raise exception 'F0 : joueur_a ou parent_a n''est plus rattaché. Tests arrêtés.';
  end if;
  if not exists (select 1 from public.dirigeant_acces where id = current_setting('t.dirigeant_ligne')::uuid and dirigeant_id = current_setting('t.dirigeant_a')::uuid
                   and educateur_id = current_setting('t.educ_a')::uuid and statut = 'accepte'
                   and permissions ->> 'entrainements' = 'edition' and permissions ->> 'competition' = 'lecture') then
    raise exception 'F0 : le dirigeant n''a plus les droits attendus (entraînements édition, compétition lecture). Tests arrêtés.';
  end if;
  if not exists (select 1 from public.club_categories where id = current_setting('t.equipe_b')::uuid and club_id = current_setting('t.club_b')::uuid and educateur_id = current_setting('t.educ_b')::uuid)
     or not exists (select 1 from public.staff_club where id = current_setting('t.staff_b_ligne')::uuid and club_id = current_setting('t.club_b')::uuid) then
    raise exception 'F0 : educ_b, equipe_b ou staff_b_ligne ne correspond plus au club B. Tests arrêtés.';
  end if;
  if exists (select 1 from public.staff_club where user_id = current_setting('t.externe')::uuid)
     or exists (select 1 from public.club_educateurs where educateur_id = current_setting('t.externe')::uuid)
     or exists (select 1 from public.affiliations where joueur_id = current_setting('t.externe')::uuid)
     or exists (select 1 from public.dirigeant_acces where dirigeant_id = current_setting('t.externe')::uuid)
     or exists (select 1 from public.parents_acces where parent_id = current_setting('t.externe')::uuid) then
    raise exception 'F0 : le compte externe a maintenant un lien avec un club. Tests arrêtés.';
  end if;
  if to_regprocedure('public.secu_peut_lire_seance(uuid, uuid)') is null then
    raise exception 'F0 : les fonctions du bloc 2 ne sont pas installées (supabase_securite_novembre_fonctions.sql). Tests arrêtés.';
  end if;
end;
$$;

-- ═════════════════════════════════════════════════════════════════════════
-- OUTILS TEMPORAIRES (disparaissent à la fin de la session)
-- ═════════════════════════════════════════════════════════════════════════

-- Remplace {nom} par l'identifiant de la fixture correspondante.
create or replace function pg_temp.sql_test(p_sql text)
returns text language plpgsql as $f$
declare
  v_sql text := p_sql;
  v_nom text;
begin
  foreach v_nom in array array['club_a', 'educ_a', 'equipe_a', 'staff_a', 'staff_a_ligne', 'joueur_a', 'parent_a',
    'dirigeant_a', 'dirigeant_ligne', 'club_b', 'educ_b', 'equipe_b', 'staff_b_ligne', 'externe',
    'fx_seance_a', 'fx_seance_a0', 'fx_seance_b', 'fx_seance_ba', 'fx_conv_a', 'fx_conv_b',
    'fx_cj_a', 'fx_cj_b', 'fx_joueur_b', 'fx_staff_col'] loop
    v_sql := replace(v_sql, '{' || v_nom || '}', quote_literal(current_setting('t.' || v_nom)) || '::uuid');
  end loop;
  return v_sql;
end;
$f$;

-- Lignes créées pour le test (en tant que propriétaire, avant de prendre
-- l'identité de l'acteur ; annulées avec le cas).
create or replace function pg_temp.preparer(p_prep text)
returns void language plpgsql as $f$
declare
  v_cle text;
begin
  -- toujours : 4 séances et 2 convocations avec un joueur convoqué chacune
  execute pg_temp.sql_test($q$
    insert into public.entrainements (id, educateur_id, date, club_categorie_id, description) values
      ({fx_seance_a},  {educ_a}, current_date, {equipe_a}, 'test sécurité'),
      ({fx_seance_a0}, {educ_a}, current_date, null,       'test sécurité'),
      ({fx_seance_b},  {educ_b}, current_date, {equipe_b}, 'test sécurité'),
      ({fx_seance_ba}, {educ_b}, current_date, {equipe_a}, 'test sécurité');
    insert into public.convocations (id, educateur_id, club_id, equipe_id, publiee) values
      ({fx_conv_a}, {educ_a}, {club_a}, {equipe_a}, true),
      ({fx_conv_b}, {educ_b}, {club_b}, {equipe_b}, true);
    insert into public.convocation_joueurs (id, convocation_id, joueur_id, statut) values
      ({fx_cj_a}, {fx_conv_a}, {joueur_a}, 'en_attente'),
      ({fx_cj_b}, {fx_conv_b}, {fx_joueur_b}, 'en_attente');
  $q$);
  foreach v_cle in array string_to_array(coalesce(p_prep, ''), ',') loop
    v_cle := trim(v_cle);
    if v_cle = '' then continue; end if;
    if v_cle = 'staff_a_president' then
      execute pg_temp.sql_test($q$ update public.staff_club set role = 'president' where id = {staff_a_ligne} $q$);
    elsif v_cle = 'collegue_a' then
      execute pg_temp.sql_test($q$ insert into public.staff_club (id, club_id, user_id, role) values ({fx_staff_col}, {club_a}, {educ_a}, 'secretaire') $q$);
    elsif v_cle = 'ds_seances_lecture' then
      execute pg_temp.sql_test($q$
        insert into public.role_permissions (club_id, role, section, can_view, can_edit) values ({club_a}, 'directeur_sportif', 'seances', true, false)
        on conflict (club_id, role, section) do update set can_view = true, can_edit = false $q$);
    elsif v_cle = 'ds_seances_sans_ligne' then
      execute pg_temp.sql_test($q$ delete from public.role_permissions where club_id = {club_a} and role = 'directeur_sportif' and section = 'seances' $q$);
    elsif v_cle = 'dirigeant_competition_edition' then
      execute pg_temp.sql_test($q$ update public.dirigeant_acces set permissions = permissions || '{"competition":"edition"}' where id = {dirigeant_ligne} $q$);
    elsif v_cle = 'dirigeant_entrainements_lecture' then
      execute pg_temp.sql_test($q$ update public.dirigeant_acces set permissions = permissions || '{"entrainements":"lecture"}' where id = {dirigeant_ligne} $q$);
    elsif v_cle = 'dirigeant_entrainements_aucun' then
      execute pg_temp.sql_test($q$ update public.dirigeant_acces set permissions = permissions || '{"entrainements":"aucun"}' where id = {dirigeant_ligne} $q$);
    elsif v_cle = 'staff_a_role_vide' then
      execute pg_temp.sql_test($q$ update public.staff_club set role = null where id = {staff_a_ligne} $q$);
    else
      raise exception 'préparation inconnue : %', v_cle;
    end if;
  end loop;
end;
$f$;

-- Joue un cas : prépare, prend l'identité de l'acteur, exécute, annule tout.
-- Rend 'oui' (vrai, ou au moins une ligne lue ou écrite), 'non' (faux, aucune
-- ligne, ou refus de la base), ou 'erreur : …'.
create or replace function pg_temp.essai(p_acteur text, p_prep text, p_sql text)
returns text language plpgsql as $f$
declare
  v_sql text := pg_temp.sql_test(p_sql);
  v_val text;
  v_n bigint;
  v_res text;
begin
  begin
    perform pg_temp.preparer(p_prep);
    if p_acteur = 'anon' then
      perform set_config('request.jwt.claims', '{"role":"anon"}', true);
      perform set_config('request.jwt.claim.sub', '', true);
      execute 'set local role anon';
    else
      perform set_config('request.jwt.claims',
        json_build_object('sub', current_setting('t.' || p_acteur), 'role', 'authenticated')::text, true);
      perform set_config('request.jwt.claim.sub', current_setting('t.' || p_acteur), true);
      execute 'set local role authenticated';
    end if;

    if v_sql ~* '^\s*(insert|update|delete)\s' then
      execute v_sql;
      get diagnostics v_n = row_count;
      v_res := case when v_n > 0 then 'oui' else 'non' end;
    else
      execute v_sql into v_val;
      v_res := case
        when v_val is null then 'non'
        when v_val in ('true', 't') then 'oui'
        when v_val in ('false', 'f') then 'non'
        when v_val ~ '^\d+$' then case when v_val::bigint > 0 then 'oui' else 'non' end
        else v_val
      end;
    end if;
    raise exception using errcode = 'P0001', message = 'secu_test_annule';
  exception when others then
    if sqlerrm = 'secu_test_annule' then
      null;
    elsif sqlstate = '42501' then
      v_res := 'non';  -- refus de la base (règle ou droit)
    else
      v_res := 'erreur : ' || sqlerrm;
    end if;
  end;
  return v_res;
end;
$f$;

drop table if exists pg_temp.secu_cas;
create temp table secu_cas (
  cas text primary key,
  bloc int,            -- 2 = fonctions ; 3, 5, 6, 7 = bloc qui ferme la table
  quoi text,
  acteur text,
  prep text,
  sql text,
  attendu text
);

-- ═════════════════════════════════════════════════════════════════════════
-- F. FONCTIONS (toutes « ok » dès le bloc 2)
-- ═════════════════════════════════════════════════════════════════════════
insert into secu_cas values
-- secu_club_ou_president
('F01', 2, 'club ou président (A) : le club A',             'club_a',      '', $q$select public.secu_club_ou_president({club_a})$q$, 'oui'),
('F02', 2, 'club ou président (A) : directeur sportif de A', 'staff_a',     '', $q$select public.secu_club_ou_president({club_a})$q$, 'non'),
('F03', 2, 'club ou président (A) : président de A',         'staff_a',     'staff_a_president', $q$select public.secu_club_ou_president({club_a})$q$, 'oui'),
('F04', 2, 'club ou président (B) : président de A',         'staff_a',     'staff_a_president', $q$select public.secu_club_ou_president({club_b})$q$, 'non'),
('F05', 2, 'club ou président (A) : éducateur de A',         'educ_a',      '', $q$select public.secu_club_ou_president({club_a})$q$, 'non'),
('F06', 2, 'club ou président (A) : club B',                 'club_b',      '', $q$select public.secu_club_ou_president({club_a})$q$, 'non'),
('F07', 2, 'club ou président (B) : club B',                 'club_b',      '', $q$select public.secu_club_ou_president({club_b})$q$, 'oui'),
('F08', 2, 'club ou président (B) : club A',                 'club_a',      '', $q$select public.secu_club_ou_president({club_b})$q$, 'non'),
('F09', 2, 'club ou président : compte qui n''est pas un club, sur son propre identifiant', 'externe', '', $q$select public.secu_club_ou_president({externe})$q$, 'non'),
('F10', 2, 'club ou président (A) : visiteur sans compte',  'anon',        '', $q$select public.secu_club_ou_president({club_a})$q$, 'non'),
-- secu_club_ou_staff
('F11', 2, 'club ou staff (A) : le club A',                  'club_a',      '', $q$select public.secu_club_ou_staff({club_a})$q$, 'oui'),
('F12', 2, 'club ou staff (A) : directeur sportif de A',     'staff_a',     '', $q$select public.secu_club_ou_staff({club_a})$q$, 'oui'),
('F13', 2, 'club ou staff (A) : staff de A au rôle vide',    'staff_a',     'staff_a_role_vide', $q$select public.secu_club_ou_staff({club_a})$q$, 'non'),
('F14', 2, 'club ou staff (A) : éducateur de A',             'educ_a',      '', $q$select public.secu_club_ou_staff({club_a})$q$, 'non'),
('F15', 2, 'club ou staff (A) : joueur de A',                'joueur_a',    '', $q$select public.secu_club_ou_staff({club_a})$q$, 'non'),
('F16', 2, 'club ou staff (A) : parent de A',                'parent_a',    '', $q$select public.secu_club_ou_staff({club_a})$q$, 'non'),
('F17', 2, 'club ou staff (A) : dirigeant de A',             'dirigeant_a', '', $q$select public.secu_club_ou_staff({club_a})$q$, 'non'),
('F18', 2, 'club ou staff (A) : staff de B',                 'educ_b',      '', $q$select public.secu_club_ou_staff({club_a})$q$, 'non'),
('F19', 2, 'club ou staff (B) : staff de B',                 'educ_b',      '', $q$select public.secu_club_ou_staff({club_b})$q$, 'oui'),
('F20', 2, 'club ou staff (B) : staff de A',                 'staff_a',     '', $q$select public.secu_club_ou_staff({club_b})$q$, 'non'),
('F21', 2, 'club ou staff (A) : compte sans lien',           'externe',     '', $q$select public.secu_club_ou_staff({club_a})$q$, 'non'),
-- secu_staff_annuaire
('F22', 2, 'annuaire (A) : le club A le lit',                'club_a',      '', $q$select count(*) from public.secu_staff_annuaire({club_a})$q$, 'oui'),
('F23', 2, 'annuaire (A) : le staff de A le lit',            'staff_a',     '', $q$select count(*) from public.secu_staff_annuaire({club_a})$q$, 'oui'),
('F24', 2, 'annuaire (A) : un collègue apparaît pour le staff', 'staff_a',  'collegue_a', $q$select count(*) from public.secu_staff_annuaire({club_a}) where user_id = {educ_a}$q$, 'oui'),
('F25', 2, 'annuaire (A) : vide pour l''éducateur de A',      'educ_a',      '', $q$select count(*) from public.secu_staff_annuaire({club_a})$q$, 'non'),
('F26', 2, 'annuaire (A) : vide pour le joueur de A',        'joueur_a',    '', $q$select count(*) from public.secu_staff_annuaire({club_a})$q$, 'non'),
('F27', 2, 'annuaire (A) : vide pour le staff de B',         'educ_b',      '', $q$select count(*) from public.secu_staff_annuaire({club_a})$q$, 'non'),
('F28', 2, 'annuaire (B) : vide pour le staff de A',         'staff_a',     '', $q$select count(*) from public.secu_staff_annuaire({club_b})$q$, 'non'),
('F29', 2, 'annuaire (A) : vide pour un compte sans lien',   'externe',     '', $q$select count(*) from public.secu_staff_annuaire({club_a})$q$, 'non'),
('F30', 2, 'annuaire : ne rend ni email ni téléphone',       'club_a',      '', $q$select pg_get_function_result('public.secu_staff_annuaire(uuid)'::regprocedure) !~* '(email|telephone)'$q$, 'oui'),
-- secu_club_peut_editer_section (Séances)
('F31', 2, 'édition Séances (A) : le club A',                'club_a',      '', $q$select public.secu_club_peut_editer_section({club_a}, 'seances', array['president','directeur_sportif'])$q$, 'oui'),
('F32', 2, 'édition Séances (A) : directeur sportif (ligne voir + modifier)', 'staff_a', '', $q$select public.secu_club_peut_editer_section({club_a}, 'seances', array['president','directeur_sportif'])$q$, 'oui'),
('F33', 2, 'édition Séances (A) : directeur sportif en lecture seule', 'staff_a', 'ds_seances_lecture', $q$select public.secu_club_peut_editer_section({club_a}, 'seances', array['president','directeur_sportif'])$q$, 'non'),
('F34', 2, 'édition Séances (A) : directeur sportif sans ligne (rôle par défaut)', 'staff_a', 'ds_seances_sans_ligne', $q$select public.secu_club_peut_editer_section({club_a}, 'seances', array['president','directeur_sportif'])$q$, 'oui'),
('F35', 2, 'édition Budget (A) : directeur sportif (ligne sans droit)', 'staff_a', '', $q$select public.secu_club_peut_editer_section({club_a}, 'budget', array['president','secretaire'])$q$, 'non'),
('F36', 2, 'édition Séances (A) : président de A',           'staff_a',     'staff_a_president,ds_seances_lecture', $q$select public.secu_club_peut_editer_section({club_a}, 'seances', array['president','directeur_sportif'])$q$, 'oui'),
('F37', 2, 'édition Séances (A) : éducateur de A',           'educ_a',      '', $q$select public.secu_club_peut_editer_section({club_a}, 'seances', array['president','directeur_sportif'])$q$, 'non'),
('F38', 2, 'édition Séances (A) : directeur sportif de B',   'educ_b',      '', $q$select public.secu_club_peut_editer_section({club_a}, 'seances', array['president','directeur_sportif'])$q$, 'non'),
('F39', 2, 'édition Séances (A) : club B',                   'club_b',      '', $q$select public.secu_club_peut_editer_section({club_a}, 'seances', array['president','directeur_sportif'])$q$, 'non'),
-- secu_peut_gerer_convocation
('F40', 2, 'convocation A, lecture : éducateur auteur',      'educ_a',      '', $q$select public.secu_peut_gerer_convocation({fx_conv_a}, false)$q$, 'oui'),
('F41', 2, 'convocation A, écriture : éducateur auteur',     'educ_a',      '', $q$select public.secu_peut_gerer_convocation({fx_conv_a}, true)$q$, 'oui'),
('F42', 2, 'convocation A, lecture : dirigeant (compétition lecture)', 'dirigeant_a', '', $q$select public.secu_peut_gerer_convocation({fx_conv_a}, false)$q$, 'oui'),
('F43', 2, 'convocation A, écriture : dirigeant (compétition lecture)', 'dirigeant_a', '', $q$select public.secu_peut_gerer_convocation({fx_conv_a}, true)$q$, 'non'),
('F44', 2, 'convocation A, écriture : dirigeant (compétition édition)', 'dirigeant_a', 'dirigeant_competition_edition', $q$select public.secu_peut_gerer_convocation({fx_conv_a}, true)$q$, 'oui'),
('F45', 2, 'convocation B, lecture : dirigeant de A',        'dirigeant_a', '', $q$select public.secu_peut_gerer_convocation({fx_conv_b}, false)$q$, 'non'),
('F46', 2, 'convocation B, lecture : éducateur de A',        'educ_a',      '', $q$select public.secu_peut_gerer_convocation({fx_conv_b}, false)$q$, 'non'),
('F47', 2, 'convocation B, écriture : éducateur auteur (B)', 'educ_b',      '', $q$select public.secu_peut_gerer_convocation({fx_conv_b}, true)$q$, 'oui'),
('F48', 2, 'convocation A, lecture : club A',                'club_a',      '', $q$select public.secu_peut_gerer_convocation({fx_conv_a}, false)$q$, 'non'),
('F49', 2, 'convocation A, lecture : joueur convoqué',       'joueur_a',    '', $q$select public.secu_peut_gerer_convocation({fx_conv_a}, false)$q$, 'non'),
('F50', 2, 'convocation A, lecture : compte sans lien',      'externe',     '', $q$select public.secu_peut_gerer_convocation({fx_conv_a}, false)$q$, 'non'),
-- secu_peut_lire_seance
('F51', 2, 'lire séance A : éducateur auteur',               'educ_a',      '', $q$select public.secu_peut_lire_seance({educ_a}, {equipe_a})$q$, 'oui'),
('F52', 2, 'lire séance A : dirigeant (édition)',            'dirigeant_a', '', $q$select public.secu_peut_lire_seance({educ_a}, {equipe_a})$q$, 'oui'),
('F53', 2, 'lire séance A : dirigeant (lecture)',            'dirigeant_a', 'dirigeant_entrainements_lecture', $q$select public.secu_peut_lire_seance({educ_a}, {equipe_a})$q$, 'oui'),
('F54', 2, 'lire séance A : dirigeant (aucun)',              'dirigeant_a', 'dirigeant_entrainements_aucun', $q$select public.secu_peut_lire_seance({educ_a}, {equipe_a})$q$, 'non'),
('F55', 2, 'lire séance A : club A',                         'club_a',      '', $q$select public.secu_peut_lire_seance({educ_a}, {equipe_a})$q$, 'oui'),
('F56', 2, 'lire séance A sans équipe : club A',             'club_a',      '', $q$select public.secu_peut_lire_seance({educ_a}, null)$q$, 'oui'),
('F57', 2, 'lire séance A : directeur sportif de A',         'staff_a',     '', $q$select public.secu_peut_lire_seance({educ_a}, {equipe_a})$q$, 'oui'),
('F58', 2, 'lire séance A sans équipe : directeur sportif de A', 'staff_a', '', $q$select public.secu_peut_lire_seance({educ_a}, null)$q$, 'oui'),
('F59', 2, 'lire séance A : joueur affilié',                 'joueur_a',    '', $q$select public.secu_peut_lire_seance({educ_a}, {equipe_a})$q$, 'oui'),
('F60', 2, 'lire séance A : parent du joueur',               'parent_a',    '', $q$select public.secu_peut_lire_seance({educ_a}, {equipe_a})$q$, 'oui'),
('F61', 2, 'lire séance A : éducateur de B',                 'educ_b',      '', $q$select public.secu_peut_lire_seance({educ_a}, {equipe_a})$q$, 'non'),
('F62', 2, 'lire séance A sans équipe : club B',             'club_b',      '', $q$select public.secu_peut_lire_seance({educ_a}, null)$q$, 'non'),
('F63', 2, 'lire séance A : compte sans lien',               'externe',     '', $q$select public.secu_peut_lire_seance({educ_a}, {equipe_a})$q$, 'non'),
('F64', 2, 'lire séance B : éducateur de A',                 'educ_a',      '', $q$select public.secu_peut_lire_seance({educ_b}, {equipe_b})$q$, 'non'),
('F65', 2, 'lire séance B : club A',                         'club_a',      '', $q$select public.secu_peut_lire_seance({educ_b}, {equipe_b})$q$, 'non'),
('F66', 2, 'lire séance B : directeur sportif de A',         'staff_a',     '', $q$select public.secu_peut_lire_seance({educ_b}, {equipe_b})$q$, 'non'),
('F67', 2, 'lire séance B : joueur de A',                    'joueur_a',    '', $q$select public.secu_peut_lire_seance({educ_b}, {equipe_b})$q$, 'non'),
('F68', 2, 'lire séance B : parent de A',                    'parent_a',    '', $q$select public.secu_peut_lire_seance({educ_b}, {equipe_b})$q$, 'non'),
('F69', 2, 'lire séance B : dirigeant de A',                 'dirigeant_a', '', $q$select public.secu_peut_lire_seance({educ_b}, {equipe_b})$q$, 'non'),
('F70', 2, 'lire séance B : club B',                         'club_b',      '', $q$select public.secu_peut_lire_seance({educ_b}, {equipe_b})$q$, 'oui'),
('F71', 2, 'lire séance d''un autre auteur dans l''équipe A : éducateur de l''équipe', 'educ_a', '', $q$select public.secu_peut_lire_seance({educ_b}, {equipe_a})$q$, 'oui'),
-- secu_peut_ecrire_seance
('F72', 2, 'créer séance A : éducateur pour lui-même',       'educ_a',      '', $q$select public.secu_peut_ecrire_seance({educ_a}, {equipe_a}, 'insert')$q$, 'oui'),
('F73', 2, 'créer séance B : éducateur de A',                'educ_a',      '', $q$select public.secu_peut_ecrire_seance({educ_b}, {equipe_b}, 'insert')$q$, 'non'),
('F74', 2, 'créer séance A : dirigeant (édition)',           'dirigeant_a', '', $q$select public.secu_peut_ecrire_seance({educ_a}, {equipe_a}, 'insert')$q$, 'oui'),
('F75', 2, 'créer séance A : dirigeant (lecture)',           'dirigeant_a', 'dirigeant_entrainements_lecture', $q$select public.secu_peut_ecrire_seance({educ_a}, {equipe_a}, 'insert')$q$, 'non'),
('F76', 2, 'créer séance A : club A, au nom de l''éducateur de l''équipe', 'club_a', '', $q$select public.secu_peut_ecrire_seance({educ_a}, {equipe_a}, 'insert')$q$, 'oui'),
('F77', 2, 'créer séance A : club A, au nom d''un autre éducateur', 'club_a',  '', $q$select public.secu_peut_ecrire_seance({educ_b}, {equipe_a}, 'insert')$q$, 'non'),
('F78', 2, 'créer séance A : directeur sportif de A',        'staff_a',     '', $q$select public.secu_peut_ecrire_seance({educ_a}, {equipe_a}, 'insert')$q$, 'oui'),
('F79', 2, 'créer séance A : directeur sportif en lecture seule', 'staff_a', 'ds_seances_lecture', $q$select public.secu_peut_ecrire_seance({educ_a}, {equipe_a}, 'insert')$q$, 'non'),
('F80', 2, 'créer séance B : club A',                        'club_a',      '', $q$select public.secu_peut_ecrire_seance({educ_b}, {equipe_b}, 'insert')$q$, 'non'),
('F81', 2, 'créer séance A : joueur',                        'joueur_a',    '', $q$select public.secu_peut_ecrire_seance({educ_a}, {equipe_a}, 'insert')$q$, 'non'),
('F82', 2, 'créer séance A : parent',                        'parent_a',    '', $q$select public.secu_peut_ecrire_seance({educ_a}, {equipe_a}, 'insert')$q$, 'non'),
('F83', 2, 'créer séance A : compte sans lien',              'externe',     '', $q$select public.secu_peut_ecrire_seance({educ_a}, {equipe_a}, 'insert')$q$, 'non'),
('F84', 2, 'modifier séance A : éducateur auteur',           'educ_a',      '', $q$select public.secu_peut_ecrire_seance({educ_a}, {equipe_a}, 'update')$q$, 'oui'),
('F85', 2, 'modifier séance A : club A (aucun écran)',       'club_a',      '', $q$select public.secu_peut_ecrire_seance({educ_a}, {equipe_a}, 'update')$q$, 'non'),
('F86', 2, 'modifier séance A : directeur sportif (aucun écran)', 'staff_a', '', $q$select public.secu_peut_ecrire_seance({educ_a}, {equipe_a}, 'update')$q$, 'non'),
('F87', 2, 'modifier séance d''un autre auteur dans l''équipe A : éducateur de l''équipe', 'educ_a', '', $q$select public.secu_peut_ecrire_seance({educ_b}, {equipe_a}, 'update')$q$, 'oui'),
('F88', 2, 'supprimer séance d''un autre auteur dans l''équipe A : éducateur de l''équipe', 'educ_a', '', $q$select public.secu_peut_ecrire_seance({educ_b}, {equipe_a}, 'delete')$q$, 'non'),
('F89', 2, 'supprimer séance A : club A',                    'club_a',      '', $q$select public.secu_peut_ecrire_seance({educ_a}, {equipe_a}, 'delete')$q$, 'oui'),
('F90', 2, 'supprimer séance A : directeur sportif de A',    'staff_a',     '', $q$select public.secu_peut_ecrire_seance({educ_a}, {equipe_a}, 'delete')$q$, 'oui'),
('F91', 2, 'supprimer séance B : directeur sportif de A',    'staff_a',     '', $q$select public.secu_peut_ecrire_seance({educ_b}, {equipe_b}, 'delete')$q$, 'non'),
('F92', 2, 'supprimer séance A sans équipe : club A',        'club_a',      '', $q$select public.secu_peut_ecrire_seance({educ_a}, null, 'delete')$q$, 'non'),
('F93', 2, 'opération inconnue : éducateur auteur',          'educ_a',      '', $q$select public.secu_peut_ecrire_seance({educ_a}, {equipe_a}, 'truncate')$q$, 'non'),
('F94', 2, 'créer séance A : visiteur sans compte',          'anon',        '', $q$select public.secu_peut_ecrire_seance({educ_a}, {equipe_a}, 'insert')$q$, 'non');

-- ═════════════════════════════════════════════════════════════════════════
-- T. TABLES (écarts normaux avant la fermeture de chaque table)
-- ═════════════════════════════════════════════════════════════════════════
insert into secu_cas values
-- role_categories_access : fermée au bloc 3
('T101', 3, 'accès catégories : le club A lit les siennes',          'club_a',  '', $q$select count(*) from public.role_categories_access where club_id = {club_a}$q$, 'oui'),
('T102', 3, 'accès catégories : le club A lit celles de B',          'club_a',  '', $q$select count(*) from public.role_categories_access where club_id = {club_b}$q$, 'non'),
('T103', 3, 'accès catégories : le président de A lit celles de A',  'staff_a', 'staff_a_president', $q$select count(*) from public.role_categories_access where club_id = {club_a}$q$, 'oui'),
('T104', 3, 'accès catégories : le directeur sportif de A les lit',  'staff_a', '', $q$select count(*) from public.role_categories_access where club_id = {club_a}$q$, 'non'),
('T105', 3, 'accès catégories : l''éducateur de A les lit',          'educ_a',  '', $q$select count(*) from public.role_categories_access where club_id = {club_a}$q$, 'non'),
('T106', 3, 'accès catégories : un compte sans lien lit celles de B', 'externe', '', $q$select count(*) from public.role_categories_access where club_id = {club_b}$q$, 'non'),
('T107', 3, 'accès catégories : visiteur sans compte',              'anon',    '', $q$select count(*) from public.role_categories_access$q$, 'non'),
('T108', 3, 'accès catégories : le club A modifie les siennes',      'club_a',  '', $q$update public.role_categories_access set categories = categories where club_id = {club_a}$q$, 'oui'),
('T109', 3, 'accès catégories : le club A modifie celles de B',      'club_a',  '', $q$update public.role_categories_access set categories = categories where club_id = {club_b}$q$, 'non'),
('T110', 3, 'accès catégories : le président de A modifie celles de A', 'staff_a', 'staff_a_president', $q$update public.role_categories_access set categories = categories where club_id = {club_a}$q$, 'oui'),
('T111', 3, 'accès catégories : le directeur sportif de A les modifie', 'staff_a', '', $q$update public.role_categories_access set acces_complet = true where club_id = {club_a} and role = 'directeur_sportif'$q$, 'non'),
('T112', 3, 'accès catégories : le club A en crée une',              'club_a',  '', $q$insert into public.role_categories_access (club_id, role, categories, acces_complet) values ({club_a}, 'test_securite', '[]', false)$q$, 'oui'),
('T113', 3, 'accès catégories : un compte sans lien en crée une pour B', 'externe', '', $q$insert into public.role_categories_access (club_id, role, categories, acces_complet) values ({club_b}, 'test_securite', '[]', true)$q$, 'non'),
('T114', 3, 'accès catégories : le club A en supprime une (aucun écran)', 'club_a', '', $q$delete from public.role_categories_access where club_id = {club_a} and role = 'directeur_sportif'$q$, 'non'),
-- staff_club : fermée au bloc 5
('T201', 5, 'staff : le club A lit son staff',                       'club_a',  '', $q$select count(*) from public.staff_club where club_id = {club_a}$q$, 'oui'),
('T202', 5, 'staff : le club A lit le staff de B',                   'club_a',  '', $q$select count(*) from public.staff_club where club_id = {club_b}$q$, 'non'),
('T203', 5, 'staff : le directeur sportif de A lit sa ligne',        'staff_a', '', $q$select count(*) from public.staff_club where user_id = {staff_a}$q$, 'oui'),
('T204', 5, 'staff : le directeur sportif de A lit un collègue en direct (email compris)', 'staff_a', 'collegue_a', $q$select count(*) from public.staff_club where club_id = {club_a} and user_id <> {staff_a}$q$, 'non'),
('T205', 5, 'staff : le président de A lit tout son staff',          'staff_a', 'staff_a_president,collegue_a', $q$select count(*) from public.staff_club where club_id = {club_a} and user_id <> {staff_a}$q$, 'oui'),
('T206', 5, 'staff : l''éducateur de A lit le staff de A',           'educ_a',  '', $q$select count(*) from public.staff_club where club_id = {club_a}$q$, 'non'),
('T207', 5, 'staff : un compte sans lien lit le staff de B',         'externe', '', $q$select count(*) from public.staff_club where club_id = {club_b}$q$, 'non'),
('T208', 5, 'staff : visiteur sans compte',                          'anon',    '', $q$select count(*) from public.staff_club$q$, 'non'),
('T209', 5, 'staff : le club A ajoute un membre',                    'club_a',  '', $q$insert into public.staff_club (club_id, user_id, role) values ({club_a}, {externe}, 'secretaire')$q$, 'oui'),
('T210', 5, 'staff : le président de A ajoute un membre',            'staff_a', 'staff_a_president', $q$insert into public.staff_club (club_id, user_id, role) values ({club_a}, {externe}, 'secretaire')$q$, 'oui'),
('T211', 5, 'staff : le directeur sportif de A ajoute un membre',    'staff_a', '', $q$insert into public.staff_club (club_id, user_id, role) values ({club_a}, {externe}, 'secretaire')$q$, 'non'),
('T212', 5, 'staff : un compte sans lien s''ajoute au staff de B sans invitation', 'externe', '', $q$insert into public.staff_club (club_id, user_id, role) values ({club_b}, {externe}, 'president')$q$, 'non'),
('T213', 5, 'staff : le club A change le rôle de son directeur sportif', 'club_a', '', $q$update public.staff_club set role = 'secretaire' where id = {staff_a_ligne}$q$, 'oui'),
('T214', 5, 'staff : le président de A change le rôle d''un collègue', 'staff_a', 'staff_a_president,collegue_a', $q$update public.staff_club set role = 'tresorier' where id = {fx_staff_col}$q$, 'oui'),
('T215', 5, 'staff : le directeur sportif se nomme président',       'staff_a', '', $q$update public.staff_club set role = 'president' where id = {staff_a_ligne}$q$, 'non'),
('T216', 5, 'staff : le club A modifie le staff de B',               'club_a',  '', $q$update public.staff_club set role = role where id = {staff_b_ligne}$q$, 'non'),
('T217', 5, 'staff : le directeur sportif de A quitte le club',      'staff_a', '', $q$delete from public.staff_club where id = {staff_a_ligne}$q$, 'oui'),
('T218', 5, 'staff : le directeur sportif de A retire un collègue',  'staff_a', 'collegue_a', $q$delete from public.staff_club where id = {fx_staff_col}$q$, 'non'),
('T219', 5, 'staff : le club B retire un membre de A',               'club_b',  '', $q$delete from public.staff_club where id = {staff_a_ligne}$q$, 'non'),
-- convocation_joueurs : fermée au bloc 6
('T301', 6, 'convoqués : l''éducateur auteur lit sa convocation',     'educ_a',  '', $q$select count(*) from public.convocation_joueurs where convocation_id = {fx_conv_a}$q$, 'oui'),
('T302', 6, 'convoqués : l''éducateur de A lit une convocation de B', 'educ_a',  '', $q$select count(*) from public.convocation_joueurs where convocation_id = {fx_conv_b}$q$, 'non'),
('T303', 6, 'convoqués : l''éducateur auteur réécrit sa liste (suppression)', 'educ_a', '', $q$delete from public.convocation_joueurs where convocation_id = {fx_conv_a}$q$, 'oui'),
('T304', 6, 'convoqués : l''éducateur auteur réécrit sa liste (ajout)', 'educ_a', '', $q$insert into public.convocation_joueurs (convocation_id, joueur_id) values ({fx_conv_a}, {joueur_a})$q$, 'oui'),
('T305', 6, 'convoqués : le dirigeant (compétition lecture) lit',     'dirigeant_a', '', $q$select count(*) from public.convocation_joueurs where convocation_id = {fx_conv_a}$q$, 'oui'),
('T306', 6, 'convoqués : le dirigeant (compétition lecture) ajoute',  'dirigeant_a', '', $q$insert into public.convocation_joueurs (convocation_id, joueur_id) values ({fx_conv_a}, {joueur_a})$q$, 'non'),
('T307', 6, 'convoqués : le dirigeant (compétition édition) ajoute',  'dirigeant_a', 'dirigeant_competition_edition', $q$insert into public.convocation_joueurs (convocation_id, joueur_id) values ({fx_conv_a}, {joueur_a})$q$, 'oui'),
('T308', 6, 'convoqués : le dirigeant (compétition édition) supprime', 'dirigeant_a', 'dirigeant_competition_edition', $q$delete from public.convocation_joueurs where convocation_id = {fx_conv_a}$q$, 'oui'),
('T309', 6, 'convoqués : le joueur lit sa ligne',                     'joueur_a', '', $q$select count(*) from public.convocation_joueurs where joueur_id = {joueur_a} and convocation_id = {fx_conv_a}$q$, 'oui'),
('T310', 6, 'convoqués : le joueur lit la convocation de B',          'joueur_a', '', $q$select count(*) from public.convocation_joueurs where convocation_id = {fx_conv_b}$q$, 'non'),
('T311', 6, 'convoqués : le joueur modifie sa ligne',                 'joueur_a', '', $q$update public.convocation_joueurs set statut = 'present' where id = {fx_cj_a}$q$, 'non'),
('T312', 6, 'convoqués : le parent lit la ligne de son enfant',       'parent_a', '', $q$select count(*) from public.convocation_joueurs where convocation_id = {fx_conv_a}$q$, 'oui'),
('T313', 6, 'convoqués : le parent lit la convocation de B',          'parent_a', '', $q$select count(*) from public.convocation_joueurs where convocation_id = {fx_conv_b}$q$, 'non'),
('T314', 6, 'convoqués : le club A lit (aucun écran)',                'club_a',  '', $q$select count(*) from public.convocation_joueurs where convocation_id = {fx_conv_a}$q$, 'non'),
('T315', 6, 'convoqués : le directeur sportif de A lit',              'staff_a', '', $q$select count(*) from public.convocation_joueurs where convocation_id = {fx_conv_a}$q$, 'non'),
('T316', 6, 'convoqués : l''éducateur de B ajoute dans la convocation A', 'educ_b', '', $q$insert into public.convocation_joueurs (convocation_id, joueur_id) values ({fx_conv_a}, {educ_b})$q$, 'non'),
('T317', 6, 'convoqués : l''éducateur de B vide la convocation A',    'educ_b',  '', $q$delete from public.convocation_joueurs where convocation_id = {fx_conv_a}$q$, 'non'),
('T318', 6, 'convoqués : un compte sans lien lit la convocation A',   'externe', '', $q$select count(*) from public.convocation_joueurs where convocation_id = {fx_conv_a}$q$, 'non'),
('T319', 6, 'convoqués : visiteur sans compte',                       'anon',    '', $q$select count(*) from public.convocation_joueurs where convocation_id = {fx_conv_a}$q$, 'non'),
-- entrainements : fermée au bloc 7
('T401', 7, 'séances : l''éducateur auteur lit la sienne',             'educ_a',  '', $q$select count(*) from public.entrainements where id = {fx_seance_a}$q$, 'oui'),
('T402', 7, 'séances : l''éducateur de A lit une séance de B',         'educ_a',  '', $q$select count(*) from public.entrainements where id = {fx_seance_b}$q$, 'non'),
('T403', 7, 'séances : l''éducateur de l''équipe lit la séance d''un autre auteur', 'educ_a', '', $q$select count(*) from public.entrainements where id = {fx_seance_ba}$q$, 'oui'),
('T404', 7, 'séances : le dirigeant lit une séance de A',              'dirigeant_a', '', $q$select count(*) from public.entrainements where id = {fx_seance_a}$q$, 'oui'),
('T405', 7, 'séances : le dirigeant lit une séance de B',              'dirigeant_a', '', $q$select count(*) from public.entrainements where id = {fx_seance_b}$q$, 'non'),
('T406', 7, 'séances : le club A lit une séance de son équipe',        'club_a',  '', $q$select count(*) from public.entrainements where id = {fx_seance_a}$q$, 'oui'),
('T407', 7, 'séances : le club A lit une séance sans équipe de son éducateur', 'club_a', '', $q$select count(*) from public.entrainements where id = {fx_seance_a0}$q$, 'oui'),
('T408', 7, 'séances : le club A lit une séance de B',                 'club_a',  '', $q$select count(*) from public.entrainements where id = {fx_seance_b}$q$, 'non'),
('T409', 7, 'séances : le directeur sportif de A lit une séance de A', 'staff_a', '', $q$select count(*) from public.entrainements where id = {fx_seance_a}$q$, 'oui'),
('T410', 7, 'séances : le directeur sportif de A lit une séance de B', 'staff_a', '', $q$select count(*) from public.entrainements where id = {fx_seance_b}$q$, 'non'),
('T411', 7, 'séances : le joueur lit une séance de son éducateur',     'joueur_a', '', $q$select count(*) from public.entrainements where id = {fx_seance_a}$q$, 'oui'),
('T412', 7, 'séances : le joueur lit une séance de B',                 'joueur_a', '', $q$select count(*) from public.entrainements where id = {fx_seance_b}$q$, 'non'),
('T413', 7, 'séances : le parent lit une séance de l''éducateur de son enfant', 'parent_a', '', $q$select count(*) from public.entrainements where id = {fx_seance_a}$q$, 'oui'),
('T414', 7, 'séances : le parent lit une séance de B',                 'parent_a', '', $q$select count(*) from public.entrainements where id = {fx_seance_b}$q$, 'non'),
('T415', 7, 'séances : l''éducateur de B lit une séance de A',         'educ_b',  '', $q$select count(*) from public.entrainements where id = {fx_seance_a}$q$, 'non'),
('T416', 7, 'séances : un compte sans lien lit une séance de A',       'externe', '', $q$select count(*) from public.entrainements where id = {fx_seance_a}$q$, 'non'),
('T417', 7, 'séances : visiteur sans compte',                          'anon',    '', $q$select count(*) from public.entrainements where id = {fx_seance_a}$q$, 'non'),
('T418', 7, 'séances : l''éducateur crée une séance pour lui',          'educ_a',  '', $q$insert into public.entrainements (educateur_id, date, club_categorie_id) values ({educ_a}, current_date, {equipe_a})$q$, 'oui'),
('T419', 7, 'séances : l''éducateur de A crée une séance au nom de B',  'educ_a',  '', $q$insert into public.entrainements (educateur_id, date, club_categorie_id) values ({educ_b}, current_date, {equipe_b})$q$, 'non'),
('T420', 7, 'séances : le dirigeant (édition) crée une séance',         'dirigeant_a', '', $q$insert into public.entrainements (educateur_id, date) values ({educ_a}, current_date)$q$, 'oui'),
('T421', 7, 'séances : le dirigeant (lecture) crée une séance',         'dirigeant_a', 'dirigeant_entrainements_lecture', $q$insert into public.entrainements (educateur_id, date) values ({educ_a}, current_date)$q$, 'non'),
('T422', 7, 'séances : le club A crée une séance pour son équipe',      'club_a',  '', $q$insert into public.entrainements (educateur_id, date, club_categorie_id) values ({educ_a}, current_date, {equipe_a})$q$, 'oui'),
('T423', 7, 'séances : le club A crée une séance pour une équipe de B', 'club_a',  '', $q$insert into public.entrainements (educateur_id, date, club_categorie_id) values ({educ_b}, current_date, {equipe_b})$q$, 'non'),
('T424', 7, 'séances : le directeur sportif de A crée une séance',      'staff_a', '', $q$insert into public.entrainements (educateur_id, date, club_categorie_id) values ({educ_a}, current_date, {equipe_a})$q$, 'oui'),
('T425', 7, 'séances : le directeur sportif en lecture seule crée une séance', 'staff_a', 'ds_seances_lecture', $q$insert into public.entrainements (educateur_id, date, club_categorie_id) values ({educ_a}, current_date, {equipe_a})$q$, 'non'),
('T426', 7, 'séances : le joueur crée une séance',                      'joueur_a', '', $q$insert into public.entrainements (educateur_id, date) values ({educ_a}, current_date)$q$, 'non'),
('T427', 7, 'séances : un compte sans lien crée une séance au nom de A', 'externe', '', $q$insert into public.entrainements (educateur_id, date) values ({educ_a}, current_date)$q$, 'non'),
('T428', 7, 'séances : l''éducateur modifie la sienne',                 'educ_a',  '', $q$update public.entrainements set description = 'modifiée' where id = {fx_seance_a}$q$, 'oui'),
('T429', 7, 'séances : l''éducateur de A modifie une séance de B',      'educ_a',  '', $q$update public.entrainements set description = 'modifiée' where id = {fx_seance_b}$q$, 'non'),
('T430', 7, 'séances : l''éducateur de l''équipe modifie la séance d''un autre auteur', 'educ_a', '', $q$update public.entrainements set description = 'modifiée' where id = {fx_seance_ba}$q$, 'oui'),
('T431', 7, 'séances : l''éducateur donne sa séance à un éducateur de B', 'educ_a', '', $q$update public.entrainements set educateur_id = {educ_b}, club_categorie_id = {equipe_b} where id = {fx_seance_a}$q$, 'non'),
('T432', 7, 'séances : le dirigeant (édition) modifie une séance',      'dirigeant_a', '', $q$update public.entrainements set description = 'modifiée' where id = {fx_seance_a}$q$, 'oui'),
('T433', 7, 'séances : le club A modifie une séance (aucun écran)',     'club_a',  '', $q$update public.entrainements set description = 'modifiée' where id = {fx_seance_a}$q$, 'non'),
('T434', 7, 'séances : le joueur modifie une séance',                   'joueur_a', '', $q$update public.entrainements set description = 'modifiée' where id = {fx_seance_a}$q$, 'non'),
('T435', 7, 'séances : le parent modifie une séance',                   'parent_a', '', $q$update public.entrainements set description = 'modifiée' where id = {fx_seance_a}$q$, 'non'),
('T436', 7, 'séances : l''éducateur supprime la sienne',                'educ_a',  '', $q$delete from public.entrainements where id = {fx_seance_a}$q$, 'oui'),
('T437', 7, 'séances : l''éducateur de l''équipe supprime la séance d''un autre auteur', 'educ_a', '', $q$delete from public.entrainements where id = {fx_seance_ba}$q$, 'non'),
('T438', 7, 'séances : le dirigeant (édition) supprime une séance',     'dirigeant_a', '', $q$delete from public.entrainements where id = {fx_seance_a}$q$, 'oui'),
('T439', 7, 'séances : le club A supprime une séance de son équipe',    'club_a',  '', $q$delete from public.entrainements where id = {fx_seance_a}$q$, 'oui'),
('T440', 7, 'séances : le directeur sportif de A supprime une séance',  'staff_a', '', $q$delete from public.entrainements where id = {fx_seance_a}$q$, 'oui'),
('T441', 7, 'séances : le club A supprime une séance de B',             'club_a',  '', $q$delete from public.entrainements where id = {fx_seance_b}$q$, 'non'),
('T442', 7, 'séances : un compte sans lien supprime une séance de A',   'externe', '', $q$delete from public.entrainements where id = {fx_seance_a}$q$, 'non'),
-- droits techniques (catalogue, aucune écriture)
('T901', 3, 'droits techniques : le visiteur sans compte n''a aucun droit sur role_categories_access', 'club_a', '',
  $q$select has_table_privilege('anon', 'public.role_categories_access', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')$q$, 'non'),
('T902', 3, 'droits techniques : aucun compte ne peut vider ni lier role_categories_access', 'club_a', '',
  $q$select has_table_privilege('authenticated', 'public.role_categories_access', 'TRUNCATE,REFERENCES,TRIGGER')$q$, 'non'),
('T903', 5, 'droits techniques : le visiteur sans compte ne peut ni écrire ni vider staff_club', 'club_a', '',
  $q$select has_table_privilege('anon', 'public.staff_club', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')$q$, 'non'),
-- Lecture technique gardée au visiteur (bloc 5) : 51 règles d'autres tables
-- consultent staff_club pour lui ; il n'y lit aucune ligne (T208).
('T909', 5, 'droits techniques : le visiteur garde la lecture technique de staff_club (autres tables)', 'club_a', '',
  $q$select has_table_privilege('anon', 'public.staff_club', 'SELECT')$q$, 'oui'),
('T904', 5, 'droits techniques : aucun compte ne peut vider ni lier staff_club', 'club_a', '',
  $q$select has_table_privilege('authenticated', 'public.staff_club', 'TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')$q$, 'non'),
('T905', 6, 'droits techniques : le visiteur sans compte n''a aucun droit sur convocation_joueurs', 'club_a', '',
  $q$select has_table_privilege('anon', 'public.convocation_joueurs', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')$q$, 'non'),
('T906', 6, 'droits techniques : aucun compte ne peut vider ni lier convocation_joueurs', 'club_a', '',
  $q$select has_table_privilege('authenticated', 'public.convocation_joueurs', 'TRUNCATE,REFERENCES,TRIGGER')$q$, 'non'),
('T907', 7, 'droits techniques : le visiteur sans compte n''a aucun droit sur entrainements', 'club_a', '',
  $q$select has_table_privilege('anon', 'public.entrainements', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')$q$, 'non'),
('T908', 7, 'droits techniques : aucun compte ne peut vider ni lier entrainements', 'club_a', '',
  $q$select has_table_privilege('authenticated', 'public.entrainements', 'TRUNCATE,REFERENCES,TRIGGER')$q$, 'non');

-- ═════════════════════════════════════════════════════════════════════════
-- RÉSULTAT
-- ═════════════════════════════════════════════════════════════════════════
with r as (
  select c.*, pg_temp.essai(c.acteur, c.prep, c.sql) as obtenu
  from secu_cas c
)
select
  cas,
  quoi,
  attendu,
  obtenu,
  case
    when obtenu = attendu then 'ok'
    when bloc = any(string_to_array(current_setting('t.blocs_appliques'), ',')::int[]) or obtenu like 'erreur%' then 'ÉCHEC'
    else 'écart, fermé au bloc ' || bloc
  end as statut
from r
order by (case when obtenu = attendu then 2 when bloc = any(string_to_array(current_setting('t.blocs_appliques'), ',')::int[]) or obtenu like 'erreur%' then 0 else 1 end), cas;
