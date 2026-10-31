-- Sécurisation module Sponsors — TESTS SQL (sans effet durable).
--
-- Chaque test s'exécute dans sa propre transaction terminée par ROLLBACK :
-- rien n'est conservé, y compris les clics insérés pendant les tests.
--
-- AVANT EXÉCUTION : renseigner les identifiants réels ci-dessous (section
-- FIXTURES). Tant qu'un identifiant vaut 00000000-..., le fichier s'arrête
-- dès le contrôle F0 sans rien exécuter d'autre.
--
-- Section 1 (T1-T4) : valable dès la phase 1.
-- Section 2 (T5-T9) : valable après la phase 2 ; ignorée automatiquement
-- (simple NOTICE) tant que "sponsors_all" existe encore.

-- ═════════════════════════════════════════════════════════════════════════
-- FIXTURES (paramètres de session, lus par current_setting dans les tests)
-- ═════════════════════════════════════════════════════════════════════════
-- club_id            : un club ayant au moins un sponsor de la saison
--                      ci-dessous avec afficher_bandeau = true
-- saison             : valeur EXACTE de sponsors.saison (text) de ce sponsor,
--                      identique à saisonActuelle() côté JS
-- sponsor_id         : un sponsor de club_id affiché en bandeau
-- sponsor_autre_club : un sponsor d'un AUTRE club
-- staff_sponsors     : membre staff_club de club_id ayant le droit sponsors
--                      (président, ou marketing/secrétaire sans ligne
--                      role_permissions contraire)
-- staff_sans_droit   : membre staff_club de club_id SANS droit sponsors
--                      (ex. buvette) — si aucun n'existe, reprendre
--                      staff_sponsors et ignorer l'échec de T3b
-- joueur_membre      : joueur affilié (accepté) à un éducateur accepté du club
-- externe            : compte sans aucun lien avec club_id
select
  set_config('sponsors_test.club_id',            '00000000-0000-0000-0000-000000000000', false),
  set_config('sponsors_test.saison',             '2026-2027', false),
  set_config('sponsors_test.sponsor_id',         '00000000-0000-0000-0000-000000000000', false),
  set_config('sponsors_test.sponsor_autre_club', '00000000-0000-0000-0000-000000000000', false),
  set_config('sponsors_test.staff_sponsors',     '00000000-0000-0000-0000-000000000000', false),
  set_config('sponsors_test.staff_sans_droit',   '00000000-0000-0000-0000-000000000000', false),
  set_config('sponsors_test.joueur_membre',      '00000000-0000-0000-0000-000000000000', false),
  set_config('sponsors_test.externe',            '00000000-0000-0000-0000-000000000000', false);

-- F0. Fixtures renseignées et cohérentes (lecture seule).
do $$
declare
  v_nom text;
begin
  foreach v_nom in array array['club_id', 'sponsor_id', 'sponsor_autre_club', 'staff_sponsors',
                               'staff_sans_droit', 'joueur_membre', 'externe'] loop
    if current_setting('sponsors_test.' || v_nom) = '00000000-0000-0000-0000-000000000000' then
      raise exception 'F0 : fixture % non renseignée — tests arrêtés, rien n''a été exécuté.', v_nom;
    end if;
  end loop;
  if not exists (
    select 1 from public.sponsors
    where id = current_setting('sponsors_test.sponsor_id')::uuid
      and club_id = current_setting('sponsors_test.club_id')::uuid
      and saison = current_setting('sponsors_test.saison')
      and afficher_bandeau = true
  ) then
    raise exception 'F0 : sponsor_id n''est pas un sponsor affiché en bandeau de club_id pour cette saison.';
  end if;
  raise notice 'F0 OK';
end;
$$;

-- ═════════════════════════════════════════════════════════════════════════
-- SECTION 1 — dès la phase 1
-- ═════════════════════════════════════════════════════════════════════════

-- T1. Membre (joueur affilié) : le bandeau renvoie au moins le sponsor de
--     test, et uniquement les 6 colonnes publiques.
begin;
do $$
declare
  v_nb integer;
  v_retour text;
begin
  v_retour := pg_get_function_result('public.sponsors_bandeau(uuid, text)'::regprocedure);
  if v_retour <> 'TABLE(id uuid, entreprise text, logo_url text, banniere_url text, lien_url text, ordre_bandeau integer)' then
    raise exception 'ECHEC T1a : colonnes renvoyées inattendues (%)', v_retour;
  end if;

  perform set_config('request.jwt.claims',
    json_build_object('sub', current_setting('sponsors_test.joueur_membre'), 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  select count(*) into v_nb
  from public.sponsors_bandeau(current_setting('sponsors_test.club_id')::uuid, current_setting('sponsors_test.saison'))
  where id = current_setting('sponsors_test.sponsor_id')::uuid;
  if v_nb <> 1 then
    raise exception 'ECHEC T1b : le joueur membre ne voit pas le sponsor de test dans le bandeau';
  end if;
  raise notice 'T1 OK';
end;
$$;
rollback;

-- T2. Externe : bandeau vide pour ce club.
begin;
do $$
declare v_nb integer;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', current_setting('sponsors_test.externe'), 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into v_nb
  from public.sponsors_bandeau(current_setting('sponsors_test.club_id')::uuid, current_setting('sponsors_test.saison'));
  if v_nb <> 0 then
    raise exception 'ECHEC T2 : un compte externe voit le bandeau du club (% lignes)', v_nb;
  end if;
  raise notice 'T2 OK';
end;
$$;
rollback;

-- T3. Droits de gestion par rôle (sponsors_peut_acceder) et absence
--     d'accès interclubs.
begin;
do $$
declare
  v_autre_club uuid;
begin
  -- Lu AVANT le changement de rôle (après la phase 2, le club de test ne
  -- peut plus lire le sponsor d'un autre club, et le test passerait à vide).
  select club_id into v_autre_club from public.sponsors
  where id = current_setting('sponsors_test.sponsor_autre_club')::uuid;
  if v_autre_club is null or v_autre_club = current_setting('sponsors_test.club_id')::uuid then
    raise exception 'T3 : sponsor_autre_club doit appartenir à un AUTRE club que club_id';
  end if;

  perform set_config('request.jwt.claims',
    json_build_object('sub', current_setting('sponsors_test.staff_sponsors'), 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  if not public.sponsors_peut_acceder(current_setting('sponsors_test.club_id')::uuid, false) then
    raise exception 'ECHEC T3a : staff avec droit sponsors refusé en lecture';
  end if;

  perform set_config('request.jwt.claims',
    json_build_object('sub', current_setting('sponsors_test.staff_sans_droit'), 'role', 'authenticated')::text, true);
  if public.sponsors_peut_acceder(current_setting('sponsors_test.club_id')::uuid, false) then
    raise exception 'ECHEC T3b : staff sans droit sponsors accepté en lecture';
  end if;

  perform set_config('request.jwt.claims',
    json_build_object('sub', current_setting('sponsors_test.externe'), 'role', 'authenticated')::text, true);
  if public.sponsors_peut_acceder(current_setting('sponsors_test.club_id')::uuid, false) then
    raise exception 'ECHEC T3c : compte externe accepté';
  end if;
  -- Un compte qui n'est pas de plan 'club' n'est pas « club » de son propre id.
  if public.sponsors_peut_acceder(current_setting('sponsors_test.externe')::uuid, true) then
    raise exception 'ECHEC T3d : un compte non-club est traité comme club de lui-même';
  end if;

  perform set_config('request.jwt.claims',
    json_build_object('sub', current_setting('sponsors_test.club_id'), 'role', 'authenticated')::text, true);
  if not public.sponsors_peut_acceder(current_setting('sponsors_test.club_id')::uuid, true) then
    raise exception 'ECHEC T3e : le compte club est refusé en édition sur son propre club';
  end if;
  -- Accès interclubs : le club de test n'a aucun droit sur le club du sponsor étranger.
  if public.sponsors_peut_acceder(v_autre_club, false) then
    raise exception 'ECHEC T3f : accès interclubs accordé';
  end if;
  raise notice 'T3 OK';
end;
$$;
rollback;

-- T4. Contrôle des clics (sponsors_clic_autorise).
begin;
do $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', current_setting('sponsors_test.joueur_membre'), 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  if not public.sponsors_clic_autorise(current_setting('sponsors_test.sponsor_id')::uuid, current_setting('sponsors_test.club_id')::uuid) then
    raise exception 'ECHEC T4a : clic légitime refusé';
  end if;
  if public.sponsors_clic_autorise(current_setting('sponsors_test.sponsor_autre_club')::uuid, current_setting('sponsors_test.club_id')::uuid) then
    raise exception 'ECHEC T4b : clic sur le sponsor d''un autre club accepté';
  end if;

  perform set_config('request.jwt.claims',
    json_build_object('sub', current_setting('sponsors_test.externe'), 'role', 'authenticated')::text, true);
  if public.sponsors_clic_autorise(current_setting('sponsors_test.sponsor_id')::uuid, current_setting('sponsors_test.club_id')::uuid) then
    raise exception 'ECHEC T4c : clic d''un compte externe accepté';
  end if;
  raise notice 'T4 OK';
end;
$$;
rollback;

-- ═════════════════════════════════════════════════════════════════════════
-- SECTION 2 — après la phase 2 (ignorée tant que sponsors_all existe)
-- ═════════════════════════════════════════════════════════════════════════

-- T5. Lecture directe de la table : club et staff autorisés voient leurs
--     sponsors ; joueur membre et externe ne voient rien.
begin;
do $$
declare v_nb integer;
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sponsors' and policyname = 'sponsors_all') then
    raise notice 'T5 ignoré : phase 2 non appliquée'; return;
  end if;

  perform set_config('role', 'authenticated', true);

  perform set_config('request.jwt.claims',
    json_build_object('sub', current_setting('sponsors_test.club_id'), 'role', 'authenticated')::text, true);
  select count(*) into v_nb from public.sponsors where id = current_setting('sponsors_test.sponsor_id')::uuid;
  if v_nb <> 1 then raise exception 'ECHEC T5a : le club ne voit plus son sponsor'; end if;

  perform set_config('request.jwt.claims',
    json_build_object('sub', current_setting('sponsors_test.staff_sponsors'), 'role', 'authenticated')::text, true);
  select count(*) into v_nb from public.sponsors where id = current_setting('sponsors_test.sponsor_id')::uuid;
  if v_nb <> 1 then raise exception 'ECHEC T5b : le staff sponsors ne voit plus le sponsor'; end if;

  perform set_config('request.jwt.claims',
    json_build_object('sub', current_setting('sponsors_test.joueur_membre'), 'role', 'authenticated')::text, true);
  select count(*) into v_nb from public.sponsors;
  if v_nb <> 0 then raise exception 'ECHEC T5c : un joueur lit encore % ligne(s) de sponsors en direct', v_nb; end if;

  perform set_config('request.jwt.claims',
    json_build_object('sub', current_setting('sponsors_test.externe'), 'role', 'authenticated')::text, true);
  select count(*) into v_nb from public.sponsors;
  if v_nb <> 0 then raise exception 'ECHEC T5d : un compte externe lit encore % ligne(s) de sponsors', v_nb; end if;
  raise notice 'T5 OK';
end;
$$;
rollback;

-- T6. Écriture interdite à un tiers : un externe ne peut ni modifier ni
--     supprimer un sponsor (0 ligne affectée, la RLS masque la ligne).
begin;
do $$
declare v_nb integer;
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sponsors' and policyname = 'sponsors_all') then
    raise notice 'T6 ignoré : phase 2 non appliquée'; return;
  end if;
  perform set_config('request.jwt.claims',
    json_build_object('sub', current_setting('sponsors_test.externe'), 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);

  update public.sponsors set notes = 'test intrusion' where id = current_setting('sponsors_test.sponsor_id')::uuid;
  get diagnostics v_nb = row_count;
  if v_nb <> 0 then raise exception 'ECHEC T6a : un externe a modifié un sponsor'; end if;

  delete from public.sponsors where id = current_setting('sponsors_test.sponsor_id')::uuid;
  get diagnostics v_nb = row_count;
  if v_nb <> 0 then raise exception 'ECHEC T6b : un externe a supprimé un sponsor'; end if;
  raise notice 'T6 OK';
end;
$$;
rollback;

-- T7. anon : aucun accès direct à sponsors.
begin;
do $$
declare v_err text;
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sponsors' and policyname = 'sponsors_all') then
    raise notice 'T7 ignoré : phase 2 non appliquée'; return;
  end if;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
  begin
    perform count(*) from public.sponsors;
    raise exception 'ECHEC T7 : anon peut encore lire sponsors';
  exception when insufficient_privilege then
    v_err := sqlerrm;
  end;
  raise notice 'T7 OK (%)', v_err;
end;
$$;
rollback;

-- T8. Portail partenaire : anon lit SA fiche par token via la RPC, même
--     sans aucun privilège sur la table.
begin;
do $$
declare
  v_token uuid;
  v_nb integer;
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sponsors' and policyname = 'sponsors_all') then
    raise notice 'T8 ignoré : phase 2 non appliquée'; return;
  end if;
  -- lu avec le rôle d'exécution du SQL Editor, AVANT de passer en anon
  select acces_token into v_token from public.sponsors where id = current_setting('sponsors_test.sponsor_id')::uuid;

  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
  select count(*) into v_nb from public.get_sponsor_by_token(v_token);
  if v_nb <> 1 then raise exception 'ECHEC T8 : le portail partenaire ne renvoie plus la fiche (% ligne)', v_nb; end if;
  raise notice 'T8 OK';
end;
$$;
rollback;

-- T9. Clics : un membre peut enregistrer un clic légitime ; un clic forgé
--     (sponsor d'un autre club) ou d'un externe est refusé par la RLS.
begin;
do $$
declare v_err text;
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sponsors' and policyname = 'sponsors_all') then
    raise notice 'T9 ignoré : phase 2 non appliquée'; return;
  end if;
  perform set_config('role', 'authenticated', true);

  perform set_config('request.jwt.claims',
    json_build_object('sub', current_setting('sponsors_test.joueur_membre'), 'role', 'authenticated')::text, true);
  insert into public.sponsor_clics_log (sponsor_id, club_id, type)
  values (current_setting('sponsors_test.sponsor_id')::uuid, current_setting('sponsors_test.club_id')::uuid, 'banniere');

  begin
    insert into public.sponsor_clics_log (sponsor_id, club_id, type)
    values (current_setting('sponsors_test.sponsor_autre_club')::uuid, current_setting('sponsors_test.club_id')::uuid, 'cta');
    raise exception 'ECHEC T9b : clic forgé accepté';
  exception when insufficient_privilege then
    v_err := sqlerrm;
  end;

  perform set_config('request.jwt.claims',
    json_build_object('sub', current_setting('sponsors_test.externe'), 'role', 'authenticated')::text, true);
  begin
    insert into public.sponsor_clics_log (sponsor_id, club_id, type)
    values (current_setting('sponsors_test.sponsor_id')::uuid, current_setting('sponsors_test.club_id')::uuid, 'banniere');
    raise exception 'ECHEC T9c : clic d''un externe accepté';
  exception when insufficient_privilege then
    v_err := sqlerrm;
  end;
  raise notice 'T9 OK';
end;
$$;
rollback;

-- ═════════════════════════════════════════════════════════════════════════
-- SECTION 3 — après la phase 3 (droits par rôle) ; ignorée sinon
-- ═════════════════════════════════════════════════════════════════════════

-- T10. Droits par rôle appliqués en base.
begin;
do $$
declare
  v_nb integer;
  v_autre_club uuid;
  v_err text;
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sponsors' and policyname = 'sponsors_select_gestion') then
    raise notice 'T10 ignoré : phase 3 non appliquée'; return;
  end if;
  select club_id into v_autre_club from public.sponsors where id = current_setting('sponsors_test.sponsor_autre_club')::uuid;

  perform set_config('role', 'authenticated', true);

  -- a. Compte club : lit son sponsor et ses niveaux.
  perform set_config('request.jwt.claims',
    json_build_object('sub', current_setting('sponsors_test.club_id'), 'role', 'authenticated')::text, true);
  select count(*) into v_nb from public.sponsors where id = current_setting('sponsors_test.sponsor_id')::uuid;
  if v_nb <> 1 then raise exception 'ECHEC T10a : le compte club ne lit plus son sponsor'; end if;

  -- b. Staff autorisé : lit et modifie un sponsor de son club.
  perform set_config('request.jwt.claims',
    json_build_object('sub', current_setting('sponsors_test.staff_sponsors'), 'role', 'authenticated')::text, true);
  update public.sponsors set notes = notes where id = current_setting('sponsors_test.sponsor_id')::uuid;
  get diagnostics v_nb = row_count;
  if v_nb <> 1 then raise exception 'ECHEC T10b : le staff autorisé ne peut plus modifier un sponsor de son club'; end if;

  -- c. Staff autorisé : impossible de déplacer un sponsor vers un autre club (WITH CHECK).
  begin
    update public.sponsors set club_id = v_autre_club where id = current_setting('sponsors_test.sponsor_id')::uuid;
    raise exception 'ECHEC T10c : sponsor déplacé vers un autre club';
  exception when insufficient_privilege then
    v_err := sqlerrm;
  end;

  -- d. Staff autorisé : ne voit pas les sponsors d'un autre club.
  select count(*) into v_nb from public.sponsors where club_id = v_autre_club;
  if v_nb <> 0 then raise exception 'ECHEC T10d : accès interclubs en lecture (% lignes)', v_nb; end if;

  -- e. Staff sans droit : ni sponsors, ni niveaux, ni statistiques ; aucune écriture.
  perform set_config('request.jwt.claims',
    json_build_object('sub', current_setting('sponsors_test.staff_sans_droit'), 'role', 'authenticated')::text, true);
  select count(*) into v_nb from public.sponsors where club_id = current_setting('sponsors_test.club_id')::uuid;
  if v_nb <> 0 then raise exception 'ECHEC T10e : staff sans droit lit % sponsor(s)', v_nb; end if;
  select count(*) into v_nb from public.niveaux_partenariat where club_id = current_setting('sponsors_test.club_id')::uuid;
  if v_nb <> 0 then raise exception 'ECHEC T10f : staff sans droit lit % niveau(x)', v_nb; end if;
  select count(*) into v_nb from public.sponsor_clics_log where club_id = current_setting('sponsors_test.club_id')::uuid;
  if v_nb <> 0 then raise exception 'ECHEC T10g : staff sans droit lit % clic(s)', v_nb; end if;
  delete from public.sponsors where id = current_setting('sponsors_test.sponsor_id')::uuid;
  get diagnostics v_nb = row_count;
  if v_nb <> 0 then raise exception 'ECHEC T10h : staff sans droit a supprimé un sponsor'; end if;

  -- f. Joueur membre : toujours aucun accès direct, bandeau toujours OK.
  perform set_config('request.jwt.claims',
    json_build_object('sub', current_setting('sponsors_test.joueur_membre'), 'role', 'authenticated')::text, true);
  select count(*) into v_nb from public.sponsors;
  if v_nb <> 0 then raise exception 'ECHEC T10i : un joueur lit des sponsors en direct'; end if;
  select count(*) into v_nb
  from public.sponsors_bandeau(current_setting('sponsors_test.club_id')::uuid, current_setting('sponsors_test.saison'));
  if v_nb = 0 then raise exception 'ECHEC T10j : le bandeau du joueur est vide après la phase 3'; end if;

  raise notice 'T10 OK';
end;
$$;
rollback;

-- ═════════════════════════════════════════════════════════════════════════
-- SECTION 4 — après la phase 4 (portail) ; ignorée sinon
-- ═════════════════════════════════════════════════════════════════════════

-- T11. Portail : anon lit la fiche par token, sans champ confidentiel, et
--      les éléments JSON sont réduits aux clés affichées.
begin;
do $$
declare
  v_token uuid;
  v_ligne jsonb;
  v_nb integer;
begin
  if to_regprocedure('public.sponsor_portail(uuid)') is null then
    raise notice 'T11 ignoré : phase 4 non appliquée'; return;
  end if;
  select acces_token into v_token from public.sponsors where id = current_setting('sponsors_test.sponsor_id')::uuid;

  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);

  select count(*) into v_nb from public.sponsor_portail(v_token);
  if v_nb <> 1 then raise exception 'ECHEC T11a : portail — % ligne(s) pour un token valide', v_nb; end if;

  select to_jsonb(r) into v_ligne from public.sponsor_portail(v_token) r;
  if v_ligne ?| array['acces_token', 'notes', 'contact_nom', 'contact_email', 'contact_telephone', 'club_id', 'niveau_id'] then
    raise exception 'ECHEC T11b : champ confidentiel renvoyé par le portail';
  end if;
  if exists (select 1 from jsonb_array_elements(v_ligne -> 'paiements') e(v), jsonb_object_keys(e.v) k
             where k not in ('date', 'mode', 'montant')) then
    raise exception 'ECHEC T11c : clé de paiement non filtrée';
  end if;
  if exists (select 1 from jsonb_array_elements(v_ligne -> 'documents') e(v), jsonb_object_keys(e.v) k
             where k not in ('label', 'url')) then
    raise exception 'ECHEC T11d : clé de document non filtrée';
  end if;

  select count(*) into v_nb from public.sponsor_portail(gen_random_uuid());
  if v_nb <> 0 then raise exception 'ECHEC T11e : un token inconnu renvoie une fiche'; end if;
  raise notice 'T11 OK';
end;
$$;
rollback;

-- T12. Après la phase 4b : get_sponsor_by_token n'est plus exécutable par anon.
begin;
do $$
begin
  if to_regprocedure('public.get_sponsor_by_token(uuid)') is null
     or has_function_privilege('anon', 'public.get_sponsor_by_token(uuid)', 'execute') then
    raise notice 'T12 ignoré : phase 4b non appliquée'; return;
  end if;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
  begin
    perform public.get_sponsor_by_token(gen_random_uuid());
    raise exception 'ECHEC T12 : anon exécute encore get_sponsor_by_token';
  exception when insufficient_privilege then
    null;
  end;
  raise notice 'T12 OK';
end;
$$;
rollback;

-- ═════════════════════════════════════════════════════════════════════════
-- SECTION 5 — après la phase 3b (prospects) ; ignorée sinon
-- ═════════════════════════════════════════════════════════════════════════
-- Fixtures supplémentaires (à renseigner ; un identifiant laissé à
-- 00000000-... désactive seulement le cas correspondant, avec une NOTICE) :
--   prospect_id          : un prospect de club_id
--   prospect_autre_club  : un prospect d'un AUTRE club
--   staff_president      : membre staff_club de club_id, rôle 'president'
--   staff_marketing      : membre staff_club de club_id, rôle 'marketing'
--   staff_secretaire     : membre staff_club de club_id, rôle 'secretaire'
--   (staff_sans_droit et club_id : fixtures de la section F0)
select
  set_config('sponsors_test.prospect_id',         '00000000-0000-0000-0000-000000000000', false),
  set_config('sponsors_test.prospect_autre_club', '00000000-0000-0000-0000-000000000000', false),
  set_config('sponsors_test.staff_president',     '00000000-0000-0000-0000-000000000000', false),
  set_config('sponsors_test.staff_marketing',     '00000000-0000-0000-0000-000000000000', false),
  set_config('sponsors_test.staff_secretaire',    '00000000-0000-0000-0000-000000000000', false);

-- T13. Prospects et échanges par rôle, sans accès interclubs.
--      Attendu par défaut : club, président, marketing, secrétaire = édition ;
--      staff_sans_droit = rien. Si une ligne role_permissions(club, rôle,
--      'sponsors') existe pour marketing/secrétaire, l'attendu est recalculé
--      depuis cette ligne (et signalé par NOTICE).
begin;
do $$
declare
  v_zero constant uuid := '00000000-0000-0000-0000-000000000000';
  v_club uuid := current_setting('sponsors_test.club_id')::uuid;
  v_prospect uuid := current_setting('sponsors_test.prospect_id')::uuid;
  v_prospect_autre uuid := current_setting('sponsors_test.prospect_autre_club')::uuid;
  v_club_autre uuid;
  v_cas record;
  v_lecture boolean;
  v_edition boolean;
  v_rp record;
  v_nb integer;
  v_echange uuid;
  v_matrice jsonb;
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'prospects_sponsors'
                 and policyname = 'prospects_sponsors_select_gestion') then
    raise notice 'T13 ignoré : phase 3b non appliquée'; return;
  end if;
  if v_prospect = v_zero or v_prospect_autre = v_zero then
    raise notice 'T13 ignoré : renseigner prospect_id et prospect_autre_club'; return;
  end if;
  if not exists (select 1 from public.prospects_sponsors where id = v_prospect and club_id = v_club) then
    raise exception 'T13 : prospect_id n''appartient pas à club_id';
  end if;
  select club_id into v_club_autre from public.prospects_sponsors where id = v_prospect_autre;
  if v_club_autre is null or v_club_autre = v_club then
    raise exception 'T13 : prospect_autre_club doit appartenir à un AUTRE club';
  end if;

  -- Matrice role_permissions du club pour la section sponsors, lue AVANT
  -- toute bascule de rôle (ensuite, la RLS de role_permissions s'applique).
  select coalesce(jsonb_object_agg(role, jsonb_build_object('can_view', can_view, 'can_edit', can_edit)), '{}'::jsonb)
    into v_matrice
  from public.role_permissions
  where club_id = v_club and section = 'sponsors' and role in ('marketing', 'secretaire');

  for v_cas in
    select * from (values
      ('club',             current_setting('sponsors_test.club_id'),          null::text),
      ('president',        current_setting('sponsors_test.staff_president'),  'president'),
      ('marketing',        current_setting('sponsors_test.staff_marketing'),  'marketing'),
      ('secretaire',       current_setting('sponsors_test.staff_secretaire'), 'secretaire'),
      ('staff_sans_droit', current_setting('sponsors_test.staff_sans_droit'), 'sans_droit')
    ) as t(libelle, uid, role_attendu)
  loop
    if v_cas.uid::uuid = v_zero then
      raise notice 'T13 [%] ignoré : fixture non renseignée', v_cas.libelle; continue;
    end if;

    -- Attendu : défaut, ou matrice configurée lue avant la boucle.
    v_lecture := v_cas.role_attendu is distinct from 'sans_droit';
    v_edition := v_lecture;
    if v_cas.role_attendu in ('marketing', 'secretaire') then
      select * into v_rp from jsonb_to_record(v_matrice -> v_cas.role_attendu) as x(can_view boolean, can_edit boolean);
      if v_matrice ? v_cas.role_attendu then
        v_lecture := coalesce(v_rp.can_view, false);
        v_edition := coalesce(v_rp.can_view, false) and coalesce(v_rp.can_edit, false);
        raise notice 'T13 [%] : matrice configurée (lecture=%, édition=%)', v_cas.libelle, v_lecture, v_edition;
      end if;
    end if;

    perform set_config('role', 'authenticated', true);
    perform set_config('request.jwt.claims', json_build_object('sub', v_cas.uid, 'role', 'authenticated')::text, true);

    -- Lecture du prospect et de ses échanges.
    select count(*) into v_nb from public.prospects_sponsors where id = v_prospect;
    if (v_nb = 1) <> v_lecture then
      raise exception 'ECHEC T13 [%] : lecture prospect = %, attendu %', v_cas.libelle, v_nb = 1, v_lecture;
    end if;

    -- Modification (sans changement réel de valeur).
    update public.prospects_sponsors set updated_at = updated_at where id = v_prospect;
    get diagnostics v_nb = row_count;
    if (v_nb = 1) <> v_edition then
      raise exception 'ECHEC T13 [%] : modification prospect = %, attendu %', v_cas.libelle, v_nb = 1, v_edition;
    end if;

    -- Ajout d'un échange.
    v_echange := null;
    begin
      insert into public.prospects_echanges (prospect_id, type, contenu)
      values (v_prospect, 'note', 'test T13') returning id into v_echange;
      if not v_edition then raise exception 'ECHEC T13 [%] : échange ajouté sans droit d''édition', v_cas.libelle; end if;
    exception when insufficient_privilege then
      if v_edition then raise exception 'ECHEC T13 [%] : ajout d''échange refusé malgré l''édition', v_cas.libelle; end if;
    end;

    if v_edition then
      -- Déplacement du prospect vers un autre club : refusé (WITH CHECK).
      begin
        update public.prospects_sponsors set club_id = v_club_autre where id = v_prospect;
        raise exception 'ECHEC T13 [%] : prospect déplacé vers un autre club', v_cas.libelle;
      exception when insufficient_privilege then null;
      end;
      -- Rattachement de l'échange au prospect d'un autre club : refusé.
      begin
        update public.prospects_echanges set prospect_id = v_prospect_autre where id = v_echange;
        raise exception 'ECHEC T13 [%] : échange rattaché au prospect d''un autre club', v_cas.libelle;
      exception when insufficient_privilege then null;
      end;
      -- Création d'un prospect pour un autre club : refusée.
      begin
        insert into public.prospects_sponsors (club_id, nom_entreprise) values (v_club_autre, 'test T13');
        raise exception 'ECHEC T13 [%] : prospect créé pour un autre club', v_cas.libelle;
      exception when insufficient_privilege then null;
      end;
    end if;

    -- Autre club : invisible et non modifiable, quel que soit le rôle.
    select count(*) into v_nb from public.prospects_sponsors where id = v_prospect_autre;
    if v_nb <> 0 then raise exception 'ECHEC T13 [%] : prospect d''un autre club visible', v_cas.libelle; end if;
    select count(*) into v_nb from public.prospects_echanges where prospect_id = v_prospect_autre;
    if v_nb <> 0 then raise exception 'ECHEC T13 [%] : échanges d''un autre club visibles', v_cas.libelle; end if;
    delete from public.prospects_sponsors where id = v_prospect_autre;
    get diagnostics v_nb = row_count;
    if v_nb <> 0 then raise exception 'ECHEC T13 [%] : prospect d''un autre club supprimé', v_cas.libelle; end if;

    raise notice 'T13 [%] OK (lecture=%, édition=%)', v_cas.libelle, v_lecture, v_edition;
  end loop;

  -- anon : aucun accès.
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
  begin
    perform count(*) from public.prospects_sponsors;
    raise exception 'ECHEC T13 [anon] : lecture des prospects possible';
  exception when insufficient_privilege then null;
  end;
  raise notice 'T13 OK';
end;
$$;
rollback;
