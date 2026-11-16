-- Chantier sécurité de novembre — BLOC 5 : fermeture de staff_club.
--
-- Avant : la règle staff_read_all laisse tout compte connecté lire tout le
-- staff de tous les clubs (email et téléphone compris) ; seul le compte club
-- écrit (club_manage_staff) ; le visiteur sans compte a tous les droits
-- techniques (même vider la table).
-- Après (matrice validée par Kevin le 2026-11-14) :
--   - lire tout le staff : le club propriétaire (compte en plan 'club') et le
--     président de son staff, via public.secu_club_ou_president (bloc 2) ;
--   - lire sa propre ligne : chacun (règle staff_lit_sa_ligne, gardée) ;
--     les collègues passent par l'annuaire secu_staff_annuaire (bloc 4) ;
--   - créer, modifier, retirer : le club et son président ;
--   - s'ajouter soi-même : seulement avec une invitation valide pour ce
--     compte, ce club et ce rôle (règle staff_accepte_invitation, gardée) ;
--   - quitter le club : sa propre ligne (règle staff_quitte_club, gardée).
--
-- Droits techniques : le visiteur sans compte et PUBLIC perdent tout sauf la
-- LECTURE technique, que le visiteur garde volontairement : 51 règles de
-- lecture de 41 autres tables (club_categories, club_educateurs,
-- matchs_equipe…) consultent staff_club et s'appliquent aussi aux visiteurs ;
-- sans ce droit, ces lectures échoueraient en « permission refusée » au lieu
-- de ne rien rendre. Aucune règle de staff_club ne s'applique au visiteur :
-- il lit 0 ligne (contrôlé à la fin). Tout compte connecté perd TRUNCATE,
-- REFERENCES, TRIGGER et MAINTAIN (droit de Postgres 17 qui permet entre
-- autres de verrouiller la table).
--
-- Lecteurs côté serveur (api/_droits.js, inviter-staff, envoyer-invitation,
-- send-newsletter) : clé de service, non concernés. Code du site : ne lit que
-- sa propre ligne (App.jsx, multiRole.js, DashboardClub.jsx, AcceptInvite.jsx,
-- GestionSponsors.jsx) ; la liste du staff passe par l'annuaire (bloc 4).
--
-- Garde-fous : arrêt sans rien modifier si la base diffère de l'état lu le
-- 2026-11-16 (5 règles exactes, fonctions du bloc 2 en place, chaque ligne
-- rattachée à un compte club).
-- Contrôles finaux dans la même transaction : un seul échec annule tout.
--
-- Secours : supabase_securite_novembre_staff_SECOURS_NE_PAS_EXECUTER.sql

begin;

-- ─────────────────────────────────────────────────────────────────────────
-- 0. Garde-fous (lecture seule : une exception annule tout)
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  v_fonction regprocedure := to_regprocedure('public.secu_club_ou_president(uuid)');
  v_invitation regprocedure := to_regprocedure('public.invitation_staff_valide(uuid,text)');
  v_proc record;
  v_nb_pol int;
  v_nb_ok int;
  v_orphelines int;
begin
  -- Table et colonnes attendues
  if to_regclass('public.staff_club') is null then
    raise exception 'ARRÊT bloc 5 : table staff_club introuvable. Rien n''a été modifié.';
  end if;
  if (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'staff_club'
        and (column_name, udt_name) in (('id', 'uuid'), ('club_id', 'uuid'), ('user_id', 'uuid'), ('role', 'text'))) <> 4 then
    raise exception 'ARRÊT bloc 5 : colonnes de staff_club différentes de l''état attendu. Rien n''a été modifié.';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.staff_club'::regclass) then
    raise exception 'ARRÊT bloc 5 : la protection par règles (RLS) n''est pas active sur staff_club. Rien n''a été modifié.';
  end if;

  -- Fonction du bloc 2
  if v_fonction is null then
    raise exception 'ARRÊT bloc 5 : public.secu_club_ou_president(uuid) absente (bloc 2 non appliqué). Rien n''a été modifié.';
  end if;
  select p.prosecdef, p.proconfig into v_proc from pg_proc p where p.oid = v_fonction;
  if not v_proc.prosecdef
     or v_proc.proconfig is distinct from array['search_path=""']
     or coalesce(obj_description(v_fonction, 'pg_proc'), '') not like 'digital-football:securite-novembre-v1%'
     or has_function_privilege('anon', v_fonction, 'execute')
     or not has_function_privilege('authenticated', v_fonction, 'execute') then
    raise exception 'ARRÊT bloc 5 : secu_club_ou_president n''est pas celle du bloc 2 (SECURITY DEFINER, search_path vide, marqueur v1, fermée à anon). Rien n''a été modifié.';
  end if;
  -- Annuaire du bloc 4 (la liste du staff à l'écran en dépend)
  if to_regprocedure('public.secu_staff_annuaire(uuid)') is null then
    raise exception 'ARRÊT bloc 5 : public.secu_staff_annuaire(uuid) absente : l''onglet Staff ne marcherait plus. Rien n''a été modifié.';
  end if;
  -- Contrôle des invitations, utilisé par la règle gardée staff_accepte_invitation
  if v_invitation is null
     or not (select prosecdef from pg_proc where oid = v_invitation) then
    raise exception 'ARRÊT bloc 5 : invitation_staff_valide(uuid, text) absente ou modifiée. Rien n''a été modifié.';
  end if;

  -- Règles actuelles : exactement les 5 lues le 2026-11-16.
  select count(*) into v_nb_pol from pg_policies where schemaname = 'public' and tablename = 'staff_club';
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'staff_club'
             and policyname = 'staff_club_president_lecture') then
    raise exception 'ARRÊT bloc 5 : ce fichier semble déjà appliqué (règles staff_club_president_* présentes). Rien n''a été modifié.';
  end if;
  if v_nb_pol <> 5 then
    raise exception 'ARRÊT bloc 5 : % règles sur staff_club, 5 attendues. Rien n''a été modifié.', v_nb_pol;
  end if;
  select count(*) into v_nb_ok from pg_policies
  where schemaname = 'public' and tablename = 'staff_club' and permissive = 'PERMISSIVE'
    and (
      (policyname = 'club_manage_staff' and cmd = 'ALL' and roles::text = '{public}'
        and qual = '(auth.uid() = club_id)' and with_check is null)
      or (policyname = 'staff_accepte_invitation' and cmd = 'INSERT' and roles::text = '{authenticated}'
        and qual is null and with_check = '((user_id = auth.uid()) AND invitation_staff_valide(club_id, role))')
      or (policyname = 'staff_lit_sa_ligne' and cmd = 'SELECT' and roles::text = '{public}'
        and qual = '((auth.uid() = club_id) OR (auth.uid() = user_id))' and with_check is null)
      or (policyname = 'staff_quitte_club' and cmd = 'DELETE' and roles::text = '{public}'
        and qual = '(auth.uid() = user_id)' and with_check is null)
      or (policyname = 'staff_read_all' and cmd = 'SELECT' and roles::text = '{public}'
        and qual = '(auth.uid() IS NOT NULL)' and with_check is null)
    );
  if v_nb_ok <> 5 then
    raise exception 'ARRÊT bloc 5 : les règles de staff_club diffèrent de celles lues le 2026-11-16 (% sur 5 identiques). Rien n''a été modifié.', v_nb_ok;
  end if;

  -- Chaque ligne appartient à un compte club : sinon elle deviendrait
  -- invisible pour son propriétaire dans la règle du club.
  select count(*) into v_orphelines
  from public.staff_club s
  where s.club_id is null
     or not exists (select 1 from public.profiles p where p.id = s.club_id and p.plan = 'club');
  if v_orphelines > 0 then
    raise exception 'ARRÊT bloc 5 : % ligne(s) de staff sans compte club. Rien n''a été modifié.', v_orphelines;
  end if;

  -- Nombre de lignes avant (comparé à la fin : aucune donnée ne doit bouger).
  perform set_config('secu.staff_lignes_avant', (select count(*) from public.staff_club)::text, true);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Règles
-- ─────────────────────────────────────────────────────────────────────────
-- La faille : tout compte connecté lisait tout le staff de tous les clubs.
drop policy staff_read_all on public.staff_club;

-- Écriture du club seul → club et président, par la fonction du bloc 2.
drop policy club_manage_staff on public.staff_club;

create policy staff_club_president_lecture on public.staff_club
  as permissive for select to authenticated
  using (public.secu_club_ou_president(club_id));

create policy staff_club_president_creation on public.staff_club
  as permissive for insert to authenticated
  with check (public.secu_club_ou_president(club_id));

create policy staff_club_president_modification on public.staff_club
  as permissive for update to authenticated
  using (public.secu_club_ou_president(club_id))
  with check (public.secu_club_ou_president(club_id));

create policy staff_club_president_suppression on public.staff_club
  as permissive for delete to authenticated
  using (public.secu_club_ou_president(club_id));

-- Règles gardées telles quelles, réservées aux comptes connectés (elles
-- s'appuient déjà sur le compte connecté : aucun effet pour le visiteur).
alter policy staff_lit_sa_ligne on public.staff_club to authenticated;
alter policy staff_quitte_club on public.staff_club to authenticated;
-- staff_accepte_invitation : inchangée (déjà réservée à authenticated).

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Droits techniques
-- ─────────────────────────────────────────────────────────────────────────
revoke all on table public.staff_club from public;
revoke insert, update, delete, truncate, references, trigger, maintain on table public.staff_club from anon;
revoke truncate, references, trigger, maintain on table public.staff_club from authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Contrôles finaux (même transaction : un échec annule tout le fichier)
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  v_compte uuid;
  v_attendu bigint;
  v_vu bigint;
  v_lignes bigint;
  v_secu text := 'public.secu_club_ou_president(club_id)';
  v_secu_court text := 'secu_club_ou_president(club_id)';
begin
  if not (select relrowsecurity from pg_class where oid = 'public.staff_club'::regclass) then
    raise exception 'ARRÊT contrôle final : RLS inactive. Rien n''a été modifié.';
  end if;

  -- Exactement les 7 règles prévues, toutes réservées à authenticated.
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'staff_club') <> 7
     or (select count(*) from pg_policies
         where schemaname = 'public' and tablename = 'staff_club'
           and permissive = 'PERMISSIVE'
           and roles::text = '{authenticated}'
           and (
             (policyname = 'staff_club_president_lecture' and cmd = 'SELECT'
               and qual in (v_secu, v_secu_court) and with_check is null)
             or (policyname = 'staff_club_president_creation' and cmd = 'INSERT'
               and qual is null and with_check in (v_secu, v_secu_court))
             or (policyname = 'staff_club_president_modification' and cmd = 'UPDATE'
               and qual in (v_secu, v_secu_court) and with_check in (v_secu, v_secu_court))
             or (policyname = 'staff_club_president_suppression' and cmd = 'DELETE'
               and qual in (v_secu, v_secu_court) and with_check is null)
             or (policyname = 'staff_accepte_invitation' and cmd = 'INSERT'
               and qual is null and with_check = '((user_id = auth.uid()) AND invitation_staff_valide(club_id, role))')
             or (policyname = 'staff_lit_sa_ligne' and cmd = 'SELECT'
               and qual = '((auth.uid() = club_id) OR (auth.uid() = user_id))' and with_check is null)
             or (policyname = 'staff_quitte_club' and cmd = 'DELETE'
               and qual = '(auth.uid() = user_id)' and with_check is null)
           )) <> 7 then
    raise exception 'ARRÊT contrôle final : les règles de staff_club ne sont pas exactement les 7 prévues. Rien n''a été modifié.';
  end if;

  -- Droits techniques
  if has_table_privilege('anon', 'public.staff_club', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') then
    raise exception 'ARRÊT contrôle final : le visiteur sans compte peut encore écrire ou vider la table. Rien n''a été modifié.';
  end if;
  if not has_table_privilege('anon', 'public.staff_club', 'SELECT') then
    raise exception 'ARRÊT contrôle final : le visiteur a perdu la lecture technique (les règles de 41 autres tables échoueraient). Rien n''a été modifié.';
  end if;
  if exists (select 1 from pg_class c, aclexplode(c.relacl) a where c.oid = 'public.staff_club'::regclass and a.grantee = 0) then
    raise exception 'ARRÊT contrôle final : PUBLIC a encore un droit sur la table. Rien n''a été modifié.';
  end if;
  if has_table_privilege('authenticated', 'public.staff_club', 'TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') then
    raise exception 'ARRÊT contrôle final : un compte connecté peut encore vider, lier ou verrouiller la table. Rien n''a été modifié.';
  end if;
  if not (has_table_privilege('authenticated', 'public.staff_club', 'SELECT')
          and has_table_privilege('authenticated', 'public.staff_club', 'INSERT')
          and has_table_privilege('authenticated', 'public.staff_club', 'UPDATE')
          and has_table_privilege('authenticated', 'public.staff_club', 'DELETE')) then
    raise exception 'ARRÊT contrôle final : authenticated a perdu lecture, création, modification ou retrait (l''onglet Staff ne marcherait plus). Rien n''a été modifié.';
  end if;

  -- Aucune donnée n'a bougé
  select count(*) into v_lignes from public.staff_club;
  if v_lignes::text <> current_setting('secu.staff_lignes_avant') then
    raise exception 'ARRÊT contrôle final : le nombre de lignes a changé. Rien n''a été modifié.';
  end if;

  -- Essai réel, pour chaque compte club et chaque membre du staff : il voit
  -- exactement sa ligne, plus tout le staff du club dont il est le compte ou
  -- le président, et rien d'autre. Chaque essai est annulé (sous-transaction).
  for v_compte in select club_id from public.staff_club union select user_id from public.staff_club where user_id is not null loop
    select count(*) into v_attendu
    from public.staff_club s
    where s.user_id = v_compte
       or s.club_id = v_compte
       or exists (select 1 from public.staff_club p
                  where p.club_id = s.club_id and p.user_id = v_compte and p.role = 'president');
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_compte, 'role', 'authenticated')::text, true);
      perform set_config('request.jwt.claim.sub', v_compte::text, true);
      execute 'set local role authenticated';
      select count(*) into v_vu from public.staff_club;
      raise exception using errcode = 'P0001', message = 'secu_essai_fini';
    exception when others then
      if sqlerrm <> 'secu_essai_fini' then raise; end if;
    end;
    if v_vu <> v_attendu then
      raise exception 'ARRÊT contrôle final : le compte % voit % ligne(s) de staff au lieu de %. Rien n''a été modifié.', v_compte, v_vu, v_attendu;
    end if;
  end loop;

  -- Un compte connecté sans lien ne voit rien.
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', (current_setting('request.jwt.claims')::json ->> 'sub'), true);
    execute 'set local role authenticated';
    select count(*) into v_vu from public.staff_club;
    raise exception using errcode = 'P0001', message = 'secu_essai_fini';
  exception when others then
    if sqlerrm <> 'secu_essai_fini' then raise; end if;
  end;
  if v_vu <> 0 then
    raise exception 'ARRÊT contrôle final : un compte sans lien voit encore % ligne(s). Rien n''a été modifié.', v_vu;
  end if;

  -- Le visiteur sans compte lit sans erreur et ne voit rien.
  begin
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    perform set_config('request.jwt.claim.sub', '', true);
    execute 'set local role anon';
    select count(*) into v_vu from public.staff_club;
    raise exception using errcode = 'P0001', message = 'secu_essai_fini';
  exception when others then
    if sqlerrm <> 'secu_essai_fini' then raise; end if;
  end;
  if v_vu <> 0 then
    raise exception 'ARRÊT contrôle final : le visiteur sans compte voit % ligne(s). Rien n''a été modifié.', v_vu;
  end if;

  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end;
$$;

commit;

select 'Bloc 5 appliqué : staff_club réservée au club, à son président et à chacun pour sa ligne.' as resultat;
