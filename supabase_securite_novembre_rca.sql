-- Chantier sécurité de novembre — BLOC 3 : fermeture de role_categories_access.
--
-- Avant : une seule règle, rca_all, « tout compte connecté lit et modifie
-- tout » ; le visiteur sans compte a tous les droits techniques (même vider
-- la table).
-- Après (matrice validée par Kevin le 2026-11-14) :
--   - lire, créer, modifier : le club propriétaire (compte en plan 'club') ou
--     le président de son staff, via public.secu_club_ou_president (bloc 2) ;
--   - supprimer : personne (aucun écran ne supprime, l'enregistrement est un
--     « upsert » sur (club_id, role)) ;
--   - autre staff, éducateurs, joueurs, parents, dirigeants, comptes sans
--     lien : rien. Le tri des catégories visibles par le staff se fait en base
--     par peut_voir_categorie (SECURITY DEFINER), qui n'est pas touchée ;
--   - visiteur sans compte : plus aucun droit technique ; tout compte
--     connecté perd TRUNCATE, REFERENCES et TRIGGER.
--
-- Seul écran concerné : Mon club → Accès du bureau (DashboardClub.jsx,
-- chargerRoleCategoriesAccess et sauvegarderPermissions).
--
-- Garde-fous : arrêt sans rien modifier si la base diffère de l'état lu le
-- 2026-11-16 (règle rca_all seule, fonction du bloc 2 en place, 42 lignes
-- appartenant toutes à un compte club).
-- Contrôles finaux dans la même transaction : un seul échec annule tout.
--
-- Secours : supabase_securite_novembre_rca_SECOURS_NE_PAS_EXECUTER.sql

begin;

-- ─────────────────────────────────────────────────────────────────────────
-- 0. Garde-fous (lecture seule : une exception annule tout)
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  v_fonction regprocedure := to_regprocedure('public.secu_club_ou_president(uuid)');
  v_proc record;
  v_pol record;
  v_nb_pol int;
  v_orphelines int;
begin
  -- Table et colonnes attendues
  if to_regclass('public.role_categories_access') is null then
    raise exception 'ARRÊT bloc 3 : table role_categories_access introuvable. Rien n''a été modifié.';
  end if;
  if (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'role_categories_access'
        and (column_name, udt_name) in (('club_id', 'uuid'), ('role', 'text'), ('categories', 'jsonb'), ('acces_complet', 'bool'))) <> 4 then
    raise exception 'ARRÊT bloc 3 : colonnes de role_categories_access différentes de l''état attendu. Rien n''a été modifié.';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.role_categories_access'::regclass) then
    raise exception 'ARRÊT bloc 3 : la protection par règles (RLS) n''est pas active sur role_categories_access. Rien n''a été modifié.';
  end if;
  -- L'écran enregistre par « upsert » sur (club_id, role) : la contrainte doit exister.
  if not exists (select 1 from pg_constraint
                 where conrelid = 'public.role_categories_access'::regclass and contype = 'u'
                   and pg_get_constraintdef(oid) = 'UNIQUE (club_id, role)') then
    raise exception 'ARRÊT bloc 3 : contrainte UNIQUE (club_id, role) absente. Rien n''a été modifié.';
  end if;

  -- Fonction du bloc 2
  if v_fonction is null then
    raise exception 'ARRÊT bloc 3 : public.secu_club_ou_president(uuid) absente (bloc 2 non appliqué). Rien n''a été modifié.';
  end if;
  select p.prosecdef, p.proconfig into v_proc from pg_proc p where p.oid = v_fonction;
  if not v_proc.prosecdef
     or v_proc.proconfig is distinct from array['search_path=""']
     or coalesce(obj_description(v_fonction, 'pg_proc'), '') not like 'digital-football:securite-novembre-v1%'
     or has_function_privilege('anon', v_fonction, 'execute')
     or not has_function_privilege('authenticated', v_fonction, 'execute') then
    raise exception 'ARRÊT bloc 3 : secu_club_ou_president n''est pas celle du bloc 2 (SECURITY DEFINER, search_path vide, marqueur v1, fermée à anon). Rien n''a été modifié.';
  end if;

  -- Règles actuelles : exactement rca_all, telle que lue le 2026-11-16.
  select count(*) into v_nb_pol from pg_policies where schemaname = 'public' and tablename = 'role_categories_access';
  if v_nb_pol = 3 and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'role_categories_access'
                              and policyname = 'rca_club_president_lecture') then
    raise exception 'ARRÊT bloc 3 : ce fichier semble déjà appliqué (règles rca_club_president_* présentes). Rien n''a été modifié.';
  end if;
  if v_nb_pol <> 1 then
    raise exception 'ARRÊT bloc 3 : % règles sur role_categories_access, 1 attendue (rca_all). Rien n''a été modifié.', v_nb_pol;
  end if;
  select * into v_pol from pg_policies where schemaname = 'public' and tablename = 'role_categories_access';
  if v_pol.policyname <> 'rca_all'
     or v_pol.cmd <> 'ALL'
     or v_pol.permissive <> 'PERMISSIVE'
     or v_pol.roles::text <> '{public}'
     or v_pol.qual is distinct from '(auth.uid() IS NOT NULL)'
     or v_pol.with_check is distinct from '(auth.uid() IS NOT NULL)' then
    raise exception 'ARRÊT bloc 3 : la règle actuelle (%) diffère de rca_all lue le 2026-11-16. Rien n''a été modifié.', v_pol.policyname;
  end if;

  -- Chaque ligne appartient à un compte club : sinon elle deviendrait
  -- invisible pour son propriétaire après la fermeture.
  select count(*) into v_orphelines
  from public.role_categories_access r
  where not exists (select 1 from public.profiles p where p.id = r.club_id and p.plan = 'club');
  if v_orphelines > 0 then
    raise exception 'ARRÊT bloc 3 : % ligne(s) appartiennent à un compte qui n''est pas en plan club. Rien n''a été modifié.', v_orphelines;
  end if;

  -- Nombre de lignes avant (comparé à la fin : aucune donnée ne doit bouger).
  perform set_config('secu.rca_lignes_avant', (select count(*) from public.role_categories_access)::text, true);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Nouvelles règles (remplacent rca_all)
-- ─────────────────────────────────────────────────────────────────────────
drop policy rca_all on public.role_categories_access;

create policy rca_club_president_lecture on public.role_categories_access
  as permissive for select to authenticated
  using (public.secu_club_ou_president(club_id));

create policy rca_club_president_creation on public.role_categories_access
  as permissive for insert to authenticated
  with check (public.secu_club_ou_president(club_id));

create policy rca_club_president_modification on public.role_categories_access
  as permissive for update to authenticated
  using (public.secu_club_ou_president(club_id))
  with check (public.secu_club_ou_president(club_id));

-- Pas de règle de suppression : personne ne supprime.

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Droits techniques
-- ─────────────────────────────────────────────────────────────────────────
revoke all on table public.role_categories_access from public, anon;
revoke truncate, references, trigger on table public.role_categories_access from authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Contrôles finaux (même transaction : un échec annule tout le fichier)
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  v_club uuid;
  v_attendu bigint;
  v_vu bigint;
  v_lignes bigint;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.role_categories_access'::regclass) then
    raise exception 'ARRÊT contrôle final : RLS inactive. Rien n''a été modifié.';
  end if;

  -- Exactement les 3 règles prévues, réservées à authenticated, toutes
  -- appuyées sur secu_club_ou_president(club_id).
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'role_categories_access') <> 3
     or (select count(*) from pg_policies
         where schemaname = 'public' and tablename = 'role_categories_access'
           and permissive = 'PERMISSIVE'
           and roles::text = '{authenticated}'
           and (
             (policyname = 'rca_club_president_lecture' and cmd = 'SELECT'
               and qual in ('secu_club_ou_president(club_id)', 'public.secu_club_ou_president(club_id)') and with_check is null)
             or (policyname = 'rca_club_president_creation' and cmd = 'INSERT'
               and qual is null and with_check in ('secu_club_ou_president(club_id)', 'public.secu_club_ou_president(club_id)'))
             or (policyname = 'rca_club_president_modification' and cmd = 'UPDATE'
               and qual in ('secu_club_ou_president(club_id)', 'public.secu_club_ou_president(club_id)') and with_check in ('secu_club_ou_president(club_id)', 'public.secu_club_ou_president(club_id)'))
           )) <> 3 then
    raise exception 'ARRÊT contrôle final : les règles de role_categories_access ne sont pas exactement les 3 prévues. Rien n''a été modifié.';
  end if;

  -- Droits techniques
  if has_table_privilege('anon', 'public.role_categories_access', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then
    raise exception 'ARRÊT contrôle final : le visiteur sans compte a encore un droit sur la table. Rien n''a été modifié.';
  end if;
  if exists (select 1 from pg_class c, aclexplode(c.relacl) a where c.oid = 'public.role_categories_access'::regclass and a.grantee = 0) then
    raise exception 'ARRÊT contrôle final : PUBLIC a encore un droit sur la table. Rien n''a été modifié.';
  end if;
  if has_table_privilege('authenticated', 'public.role_categories_access', 'TRUNCATE,REFERENCES,TRIGGER') then
    raise exception 'ARRÊT contrôle final : un compte connecté peut encore vider ou lier la table. Rien n''a été modifié.';
  end if;
  if not (has_table_privilege('authenticated', 'public.role_categories_access', 'SELECT')
          and has_table_privilege('authenticated', 'public.role_categories_access', 'INSERT')
          and has_table_privilege('authenticated', 'public.role_categories_access', 'UPDATE')) then
    raise exception 'ARRÊT contrôle final : authenticated a perdu lecture, création ou modification (l''écran ne marcherait plus). Rien n''a été modifié.';
  end if;

  -- Aucune donnée n'a bougé
  select count(*) into v_lignes from public.role_categories_access;
  if v_lignes::text <> current_setting('secu.rca_lignes_avant') then
    raise exception 'ARRÊT contrôle final : le nombre de lignes a changé. Rien n''a été modifié.';
  end if;

  -- Essai réel : chaque club propriétaire voit toutes ses lignes et rien
  -- d'autre ; un compte connecté sans lien ne voit rien. Chaque essai est
  -- annulé (sous-transaction) et rend l'identité d'origine.
  for v_club in select distinct club_id from public.role_categories_access loop
    select count(*) into v_attendu from public.role_categories_access where club_id = v_club;
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_club, 'role', 'authenticated')::text, true);
      perform set_config('request.jwt.claim.sub', v_club::text, true);
      execute 'set local role authenticated';
      select count(*) into v_vu from public.role_categories_access;
      raise exception using errcode = 'P0001', message = 'secu_essai_fini';
    exception when others then
      if sqlerrm <> 'secu_essai_fini' then raise; end if;
    end;
    if v_vu <> v_attendu then
      raise exception 'ARRÊT contrôle final : le club % voit % ligne(s) au lieu de ses %. Rien n''a été modifié.', v_club, v_vu, v_attendu;
    end if;
  end loop;

  begin
    perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', (current_setting('request.jwt.claims')::json ->> 'sub'), true);
    execute 'set local role authenticated';
    select count(*) into v_vu from public.role_categories_access;
    raise exception using errcode = 'P0001', message = 'secu_essai_fini';
  exception when others then
    if sqlerrm <> 'secu_essai_fini' then raise; end if;
  end;
  if v_vu <> 0 then
    raise exception 'ARRÊT contrôle final : un compte sans lien voit encore % ligne(s). Rien n''a été modifié.', v_vu;
  end if;

  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end;
$$;

commit;

select 'Bloc 3 appliqué : role_categories_access réservée au club et à son président.' as resultat;
