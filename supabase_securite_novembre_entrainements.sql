-- Chantier sécurité de novembre — BLOC 7 : fermeture de entrainements.
--
-- Avant (lu en base le 2026-11-17) : 4 règles « tout compte connecté »
-- (select_entrainements, insert_entrainements, update_entrainements,
-- delete_entrainements, rôle public, auth.uid() IS NOT NULL) : n'importe
-- quel compte lit, crée, modifie et SUPPRIME les séances de tous les clubs.
-- Le visiteur sans compte a tous les droits techniques (même vider la
-- table). 953 séances, dont 93 sans équipe.
-- Après (matrice validée par Kevin le 2026-11-14), via les fonctions du
-- bloc 2 public.secu_peut_lire_seance et public.secu_peut_ecrire_seance :
--   - lire : éducateur auteur ; éducateur de l'équipe ; dirigeant délégué
--     (droit « entraînements » lecture ou édition) ; club et tout son staff
--     (séances des équipes du club, et séances sans équipe de ses éducateurs
--     acceptés) ; joueur affilié accepté (toutes les séances de son
--     éducateur) ; parent accepté de ce joueur ;
--   - créer : auteur pour lui-même, dirigeant en édition, club / président /
--     rôle ayant « Séances » en édition pour une équipe du club (au nom de
--     l'éducateur de l'équipe, comme PlanificationSeances.jsx) ;
--   - modifier : auteur, dirigeant en édition, éducateur de l'équipe ; la
--     ligne modifiée doit rester dans ses droits (impossible de donner une
--     séance à un autre club) ; jamais le club (aucun écran) ;
--   - supprimer : auteur, dirigeant en édition, club / président / rôle
--     ayant « Séances » en édition pour une équipe du club ;
--   - autres éducateurs, autres clubs, comptes sans lien, visiteur : rien.
--
-- Droits techniques : le visiteur sans compte et PUBLIC perdent TOUT, y
-- compris la lecture : la seule règle d'une autre table qui consulte
-- entrainements (presences_entrainement « joueur_read_team_presences ») est
-- réservée aux comptes connectés, et les 6 fonctions qui la lisent passent
-- au-dessus des règles (SECURITY DEFINER). Tout compte connecté perd
-- TRUNCATE, REFERENCES, TRIGGER et MAINTAIN.
--
-- Non touchés : déclencheurs (journal des suppressions, date de mise à
-- jour), clés vers presences_entrainement et seances_publiees (suppression
-- en cascade, exécutée par la base au-dessus des règles).
--
-- Garde-fous : arrêt sans rien modifier si la base diffère de l'état lu le
-- 2026-11-17 (4 règles exactes, fonctions du bloc 2 en place, une seule
-- règle d'une autre table qui lit entrainements, aucune vue).
-- Contrôles finaux dans la même transaction : un seul échec annule tout.
--
-- Secours : supabase_securite_novembre_entrainements_SECOURS_NE_PAS_EXECUTER.sql

begin;

-- ─────────────────────────────────────────────────────────────────────────
-- 0. Garde-fous (lecture seule : une exception annule tout)
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  v_fn text;
  v_oid regprocedure;
  v_proc record;
  v_nb_pol int;
  v_nb_ok int;
  v_dep text;
begin
  -- Table et colonnes attendues
  if to_regclass('public.entrainements') is null then
    raise exception 'ARRÊT bloc 7 : table entrainements introuvable. Rien n''a été modifié.';
  end if;
  if (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'entrainements'
        and (column_name, udt_name, is_nullable) in (('id', 'uuid', 'NO'), ('educateur_id', 'uuid', 'NO'), ('club_categorie_id', 'uuid', 'YES'))) <> 3 then
    raise exception 'ARRÊT bloc 7 : colonnes de entrainements différentes de l''état attendu. Rien n''a été modifié.';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.entrainements'::regclass) then
    raise exception 'ARRÊT bloc 7 : la protection par règles (RLS) n''est pas active sur entrainements. Rien n''a été modifié.';
  end if;

  -- Fonctions du bloc 2 (les deux appelées par les règles, et les deux
  -- qu'elles appellent).
  foreach v_fn in array array[
    'public.secu_peut_lire_seance(uuid,uuid)',
    'public.secu_peut_ecrire_seance(uuid,uuid,text)',
    'public.secu_club_ou_staff(uuid)',
    'public.secu_club_peut_editer_section(uuid,text,text[])'
  ] loop
    v_oid := to_regprocedure(v_fn);
    if v_oid is null then
      raise exception 'ARRÊT bloc 7 : % absente (bloc 2 non appliqué). Rien n''a été modifié.', v_fn;
    end if;
    select p.prosecdef, p.proconfig into v_proc from pg_proc p where p.oid = v_oid;
    if not v_proc.prosecdef
       or v_proc.proconfig is distinct from array['search_path=""']
       or coalesce(obj_description(v_oid, 'pg_proc'), '') not like 'digital-football:securite-novembre-v1%'
       or has_function_privilege('anon', v_oid, 'execute')
       or not has_function_privilege('authenticated', v_oid, 'execute') then
      raise exception 'ARRÊT bloc 7 : % n''est pas celle du bloc 2 (SECURITY DEFINER, search_path vide, marqueur v1, fermée à anon). Rien n''a été modifié.', v_fn;
    end if;
  end loop;

  -- Règles actuelles : exactement les 4 lues le 2026-11-17.
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'entrainements'
             and policyname like 'ent\_%') then
    raise exception 'ARRÊT bloc 7 : ce fichier semble déjà appliqué (règles ent_* présentes). Rien n''a été modifié.';
  end if;
  select count(*) into v_nb_pol from pg_policies where schemaname = 'public' and tablename = 'entrainements';
  if v_nb_pol <> 4 then
    raise exception 'ARRÊT bloc 7 : % règles sur entrainements, 4 attendues. Rien n''a été modifié.', v_nb_pol;
  end if;
  select count(*) into v_nb_ok from pg_policies
  where schemaname = 'public' and tablename = 'entrainements' and permissive = 'PERMISSIVE'
    and roles::text = '{public}'
    and (
      (policyname = 'select_entrainements' and cmd = 'SELECT' and qual = '(auth.uid() IS NOT NULL)' and with_check is null)
      or (policyname = 'insert_entrainements' and cmd = 'INSERT' and qual is null and with_check = '(auth.uid() IS NOT NULL)')
      or (policyname = 'update_entrainements' and cmd = 'UPDATE' and qual = '(auth.uid() IS NOT NULL)' and with_check is null)
      or (policyname = 'delete_entrainements' and cmd = 'DELETE' and qual = '(auth.uid() IS NOT NULL)' and with_check is null)
    );
  if v_nb_ok <> 4 then
    raise exception 'ARRÊT bloc 7 : les règles de entrainements diffèrent de celles lues le 2026-11-17 (% sur 4 identiques). Rien n''a été modifié.', v_nb_ok;
  end if;

  -- Règles d'autres tables qui consultent entrainements : une seule
  -- attendue, réservée aux comptes connectés. Une autre règle (surtout
  -- ouverte au visiteur) pourrait casser quand le visiteur perd la lecture.
  select string_agg(distinct c.relname || '.' || p.polname, ', ') into v_dep
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_depend d on d.classid = 'pg_policy'::regclass and d.objid = p.oid
  where d.refobjid = 'public.entrainements'::regclass and c.oid <> 'public.entrainements'::regclass;
  if v_dep is distinct from 'presences_entrainement.joueur_read_team_presences' then
    raise exception 'ARRÊT bloc 7 : règles d''autres tables qui lisent entrainements différentes de l''état attendu (%). Rien n''a été modifié.', coalesce(v_dep, 'aucune');
  end if;
  if (select roles::text from pg_policies where schemaname = 'public' and tablename = 'presences_entrainement'
      and policyname = 'joueur_read_team_presences') is distinct from '{authenticated}' then
    raise exception 'ARRÊT bloc 7 : la règle joueur_read_team_presences n''est plus réservée aux comptes connectés. Rien n''a été modifié.';
  end if;

  -- Aucune vue ne lit entrainements.
  if exists (select 1 from pg_depend d join pg_rewrite r on r.oid = d.objid
             where d.classid = 'pg_rewrite'::regclass and d.refobjid = 'public.entrainements'::regclass
               and r.ev_class <> 'public.entrainements'::regclass) then
    raise exception 'ARRÊT bloc 7 : une vue lit entrainements (non prévu). Rien n''a été modifié.';
  end if;

  -- Fonctions qui lisent entrainements : toutes doivent passer au-dessus des
  -- règles, sinon elles verraient moins de séances après la fermeture.
  select string_agg(p.oid::regprocedure::text, ', ') into v_dep
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosrc ilike '%entrainements%' and not p.prosecdef;
  if v_dep is not null then
    raise exception 'ARRÊT bloc 7 : fonction(s) sans SECURITY DEFINER qui lisent entrainements : %. Rien n''a été modifié.', v_dep;
  end if;

  -- Nombre de lignes avant (comparé à la fin : aucune donnée ne doit bouger).
  perform set_config('secu.ent_lignes_avant', (select count(*) from public.entrainements)::text, true);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Règles
-- ─────────────────────────────────────────────────────────────────────────
-- La faille : tout compte connecté lit, crée, modifie, supprime partout.
drop policy select_entrainements on public.entrainements;
drop policy insert_entrainements on public.entrainements;
drop policy update_entrainements on public.entrainements;
drop policy delete_entrainements on public.entrainements;

-- Raccourci « ma séance » d'abord (calculé une fois par requête) : le
-- tableau de l'éducateur, l'écran qui lit le plus de séances, n'appelle pas
-- la fonction. Même résultat : la fonction dit déjà oui à l'auteur.
create policy ent_lecture on public.entrainements
  as permissive for select to authenticated
  using (educateur_id = (select auth.uid()) or public.secu_peut_lire_seance(educateur_id, club_categorie_id));

create policy ent_ajout on public.entrainements
  as permissive for insert to authenticated
  with check (public.secu_peut_ecrire_seance(educateur_id, club_categorie_id, 'insert'));

-- La ligne avant ET après modification doit être dans les droits.
create policy ent_modification on public.entrainements
  as permissive for update to authenticated
  using (public.secu_peut_ecrire_seance(educateur_id, club_categorie_id, 'update'))
  with check (public.secu_peut_ecrire_seance(educateur_id, club_categorie_id, 'update'));

create policy ent_suppression on public.entrainements
  as permissive for delete to authenticated
  using (public.secu_peut_ecrire_seance(educateur_id, club_categorie_id, 'delete'));

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Droits techniques
-- ─────────────────────────────────────────────────────────────────────────
revoke all on table public.entrainements from public;
revoke all on table public.entrainements from anon;
revoke truncate, references, trigger, maintain on table public.entrainements from authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Contrôles finaux (même transaction : un échec annule tout le fichier)
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  v_compte uuid;
  v_attendu bigint;
  v_vu bigint;
  v_ids uuid[];
  v_equipes uuid[];
  v_educs uuid[];
  v_seance uuid;
  v_lignes bigint;
  v_n bigint;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.entrainements'::regclass) then
    raise exception 'ARRÊT contrôle final : RLS inactive. Rien n''a été modifié.';
  end if;

  -- Exactement les 4 règles prévues, toutes réservées à authenticated
  -- (texte comparé sans le préfixe « public. », que Postgres peut omettre).
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'entrainements') <> 4
     or (select count(*) from pg_policies
         where schemaname = 'public' and tablename = 'entrainements'
           and permissive = 'PERMISSIVE'
           and roles::text = '{authenticated}'
           and (
             (policyname = 'ent_lecture' and cmd = 'SELECT' and with_check is null
               and replace(qual, 'public.', '') = '((educateur_id = ( SELECT auth.uid() AS uid)) OR secu_peut_lire_seance(educateur_id, club_categorie_id))')
             or (policyname = 'ent_ajout' and cmd = 'INSERT' and qual is null
               and replace(with_check, 'public.', '') = 'secu_peut_ecrire_seance(educateur_id, club_categorie_id, ''insert''::text)')
             or (policyname = 'ent_modification' and cmd = 'UPDATE'
               and replace(qual, 'public.', '') = 'secu_peut_ecrire_seance(educateur_id, club_categorie_id, ''update''::text)'
               and replace(with_check, 'public.', '') = 'secu_peut_ecrire_seance(educateur_id, club_categorie_id, ''update''::text)')
             or (policyname = 'ent_suppression' and cmd = 'DELETE' and with_check is null
               and replace(qual, 'public.', '') = 'secu_peut_ecrire_seance(educateur_id, club_categorie_id, ''delete''::text)')
           )) <> 4 then
    raise exception 'ARRÊT contrôle final : les règles de entrainements ne sont pas exactement les 4 prévues. Rien n''a été modifié.';
  end if;

  -- Droits techniques
  if has_table_privilege('anon', 'public.entrainements', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') then
    raise exception 'ARRÊT contrôle final : le visiteur sans compte a encore un droit sur la table. Rien n''a été modifié.';
  end if;
  if exists (select 1 from pg_class c, aclexplode(c.relacl) a where c.oid = 'public.entrainements'::regclass and a.grantee = 0) then
    raise exception 'ARRÊT contrôle final : PUBLIC a encore un droit sur la table. Rien n''a été modifié.';
  end if;
  if has_table_privilege('authenticated', 'public.entrainements', 'TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') then
    raise exception 'ARRÊT contrôle final : un compte connecté peut encore vider, lier ou verrouiller la table. Rien n''a été modifié.';
  end if;
  if not (has_table_privilege('authenticated', 'public.entrainements', 'SELECT')
          and has_table_privilege('authenticated', 'public.entrainements', 'INSERT')
          and has_table_privilege('authenticated', 'public.entrainements', 'UPDATE')
          and has_table_privilege('authenticated', 'public.entrainements', 'DELETE')) then
    raise exception 'ARRÊT contrôle final : authenticated a perdu lecture, création, modification ou suppression. Rien n''a été modifié.';
  end if;

  -- Aucune donnée n'a bougé
  select count(*) into v_lignes from public.entrainements;
  if v_lignes::text <> current_setting('secu.ent_lignes_avant') then
    raise exception 'ARRÊT contrôle final : le nombre de séances a changé. Rien n''a été modifié.';
  end if;

  -- Essai réel, pour chaque éducateur auteur : il voit toutes ses séances
  -- et peut modifier l'une d'elles. Les listes sont calculées AVANT de
  -- prendre l'identité du compte ; chaque essai est annulé.
  for v_compte in select distinct educateur_id from public.entrainements loop
    select count(*), (array_agg(id))[1] into v_attendu, v_seance from public.entrainements where educateur_id = v_compte;
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_compte, 'role', 'authenticated')::text, true);
      perform set_config('request.jwt.claim.sub', v_compte::text, true);
      execute 'set local role authenticated';
      select count(*) into v_vu from public.entrainements where educateur_id = v_compte;
      update public.entrainements set description = description where id = v_seance;
      get diagnostics v_n = row_count;
      raise exception using errcode = 'P0001', message = 'secu_essai_fini';
    exception when others then
      if sqlerrm <> 'secu_essai_fini' then raise; end if;
    end;
    if v_vu <> v_attendu then
      raise exception 'ARRÊT contrôle final : l''éducateur % voit % séance(s) sur ses % . Rien n''a été modifié.', v_compte, v_vu, v_attendu;
    end if;
    if v_n <> 1 then
      raise exception 'ARRÊT contrôle final : l''éducateur % ne peut plus modifier sa séance %. Rien n''a été modifié.', v_compte, v_seance;
    end if;
  end loop;

  -- Essai réel, pour chaque compte club (plan club) et chaque membre de
  -- staff : il voit toutes les séances des équipes du club et les séances
  -- sans équipe de ses éducateurs acceptés.
  for v_compte in
    select pr.id from public.profiles pr
    where pr.plan = 'club' and exists (select 1 from public.club_categories cc where cc.club_id = pr.id)
    union
    select sc.user_id from public.staff_club sc where sc.role is not null and sc.user_id is not null
  loop
    select array_agg(cc.id) into v_equipes from public.club_categories cc
    where cc.club_id = v_compte
       or cc.club_id in (select sc.club_id from public.staff_club sc where sc.user_id = v_compte and sc.role is not null);
    select array_agg(ce.educateur_id) into v_educs from public.club_educateurs ce
    where ce.statut = 'accepte'
      and (ce.club_id = v_compte
           or ce.club_id in (select sc.club_id from public.staff_club sc where sc.user_id = v_compte and sc.role is not null));
    select count(*) into v_attendu from public.entrainements e
    where e.club_categorie_id = any (coalesce(v_equipes, '{}'))
       or (e.club_categorie_id is null and e.educateur_id = any (coalesce(v_educs, '{}')));
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_compte, 'role', 'authenticated')::text, true);
      perform set_config('request.jwt.claim.sub', v_compte::text, true);
      execute 'set local role authenticated';
      select count(*) into v_vu from public.entrainements e
      where e.club_categorie_id = any (coalesce(v_equipes, '{}'))
         or (e.club_categorie_id is null and e.educateur_id = any (coalesce(v_educs, '{}')));
      raise exception using errcode = 'P0001', message = 'secu_essai_fini';
    exception when others then
      if sqlerrm <> 'secu_essai_fini' then raise; end if;
    end;
    if v_vu <> v_attendu then
      raise exception 'ARRÊT contrôle final : le club ou membre du staff % voit % séance(s) du club au lieu de %. Rien n''a été modifié.', v_compte, v_vu, v_attendu;
    end if;
  end loop;

  -- Essai réel, pour chaque joueur affilié accepté : il voit toutes les
  -- séances de ses éducateurs, et lit sans erreur ses présences d'équipe.
  for v_compte in select distinct a.joueur_id from public.affiliations a
                  where a.statut = 'accepte' and a.joueur_id is not null loop
    select array_agg(a.educateur_id) into v_educs from public.affiliations a
    where a.joueur_id = v_compte and a.statut = 'accepte';
    select count(*) into v_attendu from public.entrainements e where e.educateur_id = any (v_educs);
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_compte, 'role', 'authenticated')::text, true);
      perform set_config('request.jwt.claim.sub', v_compte::text, true);
      execute 'set local role authenticated';
      select count(*) into v_vu from public.entrainements e where e.educateur_id = any (v_educs);
      perform count(*) from public.presences_entrainement;
      raise exception using errcode = 'P0001', message = 'secu_essai_fini';
    exception when others then
      if sqlerrm <> 'secu_essai_fini' then raise; end if;
    end;
    if v_vu <> v_attendu then
      raise exception 'ARRÊT contrôle final : le joueur % voit % séance(s) de ses éducateurs au lieu de %. Rien n''a été modifié.', v_compte, v_vu, v_attendu;
    end if;
  end loop;

  -- Essai réel, pour chaque parent accepté : il voit toutes les séances des
  -- éducateurs de ses enfants.
  for v_compte in select distinct pa.parent_id from public.parents_acces pa
                  where pa.statut = 'accepte' and pa.parent_id is not null loop
    select array_agg(a.educateur_id) into v_educs
    from public.parents_acces pa join public.affiliations a on a.joueur_id = pa.joueur_id
    where pa.parent_id = v_compte and pa.statut = 'accepte' and a.statut = 'accepte';
    select count(*) into v_attendu from public.entrainements e where e.educateur_id = any (coalesce(v_educs, '{}'));
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_compte, 'role', 'authenticated')::text, true);
      perform set_config('request.jwt.claim.sub', v_compte::text, true);
      execute 'set local role authenticated';
      select count(*) into v_vu from public.entrainements e where e.educateur_id = any (coalesce(v_educs, '{}'));
      raise exception using errcode = 'P0001', message = 'secu_essai_fini';
    exception when others then
      if sqlerrm <> 'secu_essai_fini' then raise; end if;
    end;
    if v_vu <> v_attendu then
      raise exception 'ARRÊT contrôle final : le parent % voit % séance(s) au lieu de %. Rien n''a été modifié.', v_compte, v_vu, v_attendu;
    end if;
  end loop;

  -- Essai réel, pour chaque dirigeant ayant le droit « entraînements » en
  -- lecture ou édition : il voit toutes les séances de l'éducateur délégant.
  for v_compte in select distinct da.dirigeant_id from public.dirigeant_acces da
                  where da.statut = 'accepte' and da.dirigeant_id is not null
                    and (da.permissions ->> 'entrainements') in ('lecture', 'edition') loop
    select array_agg(da.educateur_id) into v_educs from public.dirigeant_acces da
    where da.dirigeant_id = v_compte and da.statut = 'accepte'
      and (da.permissions ->> 'entrainements') in ('lecture', 'edition');
    select count(*) into v_attendu from public.entrainements e where e.educateur_id = any (v_educs);
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_compte, 'role', 'authenticated')::text, true);
      perform set_config('request.jwt.claim.sub', v_compte::text, true);
      execute 'set local role authenticated';
      select count(*) into v_vu from public.entrainements e where e.educateur_id = any (v_educs);
      raise exception using errcode = 'P0001', message = 'secu_essai_fini';
    exception when others then
      if sqlerrm <> 'secu_essai_fini' then raise; end if;
    end;
    if v_vu <> v_attendu then
      raise exception 'ARRÊT contrôle final : le dirigeant % voit % séance(s) de l''éducateur délégant au lieu de %. Rien n''a été modifié.', v_compte, v_vu, v_attendu;
    end if;
  end loop;

  -- Un compte connecté sans lien ne voit rien et ne peut rien modifier.
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', (current_setting('request.jwt.claims')::json ->> 'sub'), true);
    execute 'set local role authenticated';
    select count(*) into v_vu from public.entrainements;
    update public.entrainements set description = description;
    get diagnostics v_n = row_count;
    raise exception using errcode = 'P0001', message = 'secu_essai_fini';
  exception when others then
    if sqlerrm <> 'secu_essai_fini' then raise; end if;
  end;
  if v_vu <> 0 or v_n <> 0 then
    raise exception 'ARRÊT contrôle final : un compte sans lien voit % séance(s) et en modifie %. Rien n''a été modifié.', v_vu, v_n;
  end if;

  -- Le visiteur sans compte est refusé sur entrainements, et lit toujours
  -- presences_entrainement sans « permission refusée ».
  v_vu := null;
  begin
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    perform set_config('request.jwt.claim.sub', '', true);
    execute 'set local role anon';
    select count(*) into v_vu from public.entrainements;
    raise exception using errcode = 'P0001', message = 'secu_essai_fini';
  exception when others then
    if sqlstate = '42501' then
      v_vu := -1;  -- refus attendu
    elsif sqlerrm <> 'secu_essai_fini' then raise; end if;
  end;
  if v_vu is distinct from -1 then
    raise exception 'ARRÊT contrôle final : le visiteur sans compte peut encore lire entrainements. Rien n''a été modifié.';
  end if;
  begin
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    perform set_config('request.jwt.claim.sub', '', true);
    execute 'set local role anon';
    perform count(*) from public.presences_entrainement;
    raise exception using errcode = 'P0001', message = 'secu_essai_fini';
  exception when others then
    if sqlstate = '42501' then
      raise exception 'ARRÊT contrôle final : le visiteur sans compte reçoit « permission refusée » sur presences_entrainement (%). Rien n''a été modifié.', sqlerrm;
    elsif sqlerrm <> 'secu_essai_fini' then raise; end if;
  end;

  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end;
$$;

commit;

select 'Bloc 7 appliqué : entrainements réservée à l''éducateur, à son équipe, à son dirigeant, à son club et staff, à ses joueurs et à leurs parents.' as resultat;
