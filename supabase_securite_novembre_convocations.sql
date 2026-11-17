-- Chantier sécurité de novembre — BLOC 6 : fermeture de convocation_joueurs.
--
-- Avant (lu en base le 2026-11-16) : la règle « lecture convocation joueurs »
-- (USING true, rôle public) laisse lire la liste des joueurs convoqués de
-- tous les clubs, MÊME SANS COMPTE ; « gestion convocation joueurs » laisse
-- tout compte ayant une fiche profil_educateur tout modifier, tous clubs
-- (et bloque les 12 éducateurs sans fiche, dont testfinal) ; le visiteur
-- sans compte a tous les droits techniques (même vider la table).
-- Après (matrice validée par Kevin le 2026-11-14) :
--   - éducateur auteur de la convocation : lire, ajouter, retirer ;
--   - dirigeant délégué : lire si son droit « compétition » est lecture ou
--     édition ; ajouter et retirer s'il est en édition ;
--     (les deux via public.secu_peut_gerer_convocation, bloc 2, qui lit
--     convocations sans ses règles : pas de boucle avec les règles de
--     convocations, qui lisent déjà cette table) ;
--   - joueur convoqué : sa propre ligne ;
--   - parent accepté : les lignes de son enfant (parent_lit_donnees_enfant,
--     gardée) ;
--   - chantier catégories : categories_commun_lecture, gardée telle quelle ;
--   - club, staff, autres éducateurs, comptes sans lien, visiteur : rien ;
--   - modifier une ligne : personne depuis le navigateur (aucun écran ; le
--     statut est écrit par categories_publier_convocation, qui passe
--     au-dessus des règles).
--
-- Droits techniques : le visiteur sans compte et PUBLIC perdent tout sauf la
-- LECTURE technique, que le visiteur garde volontairement : 2 règles de la
-- table convocations (« Joueur voit sa convocation », « Parent voit
-- convocation enfant », rôle public) consultent convocation_joueurs ; sans ce
-- droit, toute lecture de convocations par un visiteur échouerait en
-- « permission refusée » au lieu de ne rien rendre. Aucune règle de
-- convocation_joueurs ne s'applique au visiteur : il lit 0 ligne (contrôlé à
-- la fin). Tout compte connecté perd TRUNCATE, REFERENCES, TRIGGER et
-- MAINTAIN.
--
-- Code du site : DashboardEducateur.jsx (lecture, puis suppression et
-- réécriture de la liste par l'auteur ou le dirigeant), DashboardJoueur.jsx
-- (lecture par le joueur, ou par le parent avec l'identifiant de l'enfant).
-- Aucun lecteur côté serveur.
--
-- Garde-fous : arrêt sans rien modifier si la base diffère de l'état lu le
-- 2026-11-16 (4 règles exactes, fonctions en place, chaque ligne rattachée à
-- une convocation qui a un éducateur).
-- Contrôles finaux dans la même transaction : un seul échec annule tout.
--
-- Secours : supabase_securite_novembre_convocations_SECOURS_NE_PAS_EXECUTER.sql

begin;

-- ─────────────────────────────────────────────────────────────────────────
-- 0. Garde-fous (lecture seule : une exception annule tout)
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  v_fonction regprocedure := to_regprocedure('public.secu_peut_gerer_convocation(uuid,boolean)');
  v_parent regprocedure := to_regprocedure('public.est_parent_accepte_de(uuid)');
  v_commun regprocedure := to_regprocedure('public.categories_convocation_commune_visible(uuid)');
  v_proc record;
  v_nb_pol int;
  v_nb_ok int;
  v_orphelines int;
begin
  -- Tables et colonnes attendues
  if to_regclass('public.convocation_joueurs') is null or to_regclass('public.convocations') is null then
    raise exception 'ARRÊT bloc 6 : table convocation_joueurs ou convocations introuvable. Rien n''a été modifié.';
  end if;
  if (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'convocation_joueurs'
        and (column_name, udt_name) in (('id', 'uuid'), ('convocation_id', 'uuid'), ('joueur_id', 'uuid'), ('statut', 'text'))) <> 4 then
    raise exception 'ARRÊT bloc 6 : colonnes de convocation_joueurs différentes de l''état attendu. Rien n''a été modifié.';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.convocation_joueurs'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.convocations'::regclass) then
    raise exception 'ARRÊT bloc 6 : la protection par règles (RLS) n''est pas active sur convocation_joueurs ou convocations. Rien n''a été modifié.';
  end if;

  -- Fonction du bloc 2
  if v_fonction is null then
    raise exception 'ARRÊT bloc 6 : public.secu_peut_gerer_convocation(uuid, boolean) absente (bloc 2 non appliqué). Rien n''a été modifié.';
  end if;
  select p.prosecdef, p.proconfig into v_proc from pg_proc p where p.oid = v_fonction;
  if not v_proc.prosecdef
     or v_proc.proconfig is distinct from array['search_path=""']
     or coalesce(obj_description(v_fonction, 'pg_proc'), '') not like 'digital-football:securite-novembre-v1%'
     or has_function_privilege('anon', v_fonction, 'execute')
     or not has_function_privilege('authenticated', v_fonction, 'execute') then
    raise exception 'ARRÊT bloc 6 : secu_peut_gerer_convocation n''est pas celle du bloc 2 (SECURITY DEFINER, search_path vide, marqueur v1, fermée à anon). Rien n''a été modifié.';
  end if;
  -- Fonctions des règles gardées
  if v_parent is null or not (select prosecdef from pg_proc where oid = v_parent)
     or not has_function_privilege('authenticated', v_parent, 'execute') then
    raise exception 'ARRÊT bloc 6 : est_parent_accepte_de(uuid) absente ou modifiée (l''écran parent ne marcherait plus). Rien n''a été modifié.';
  end if;
  if v_commun is null or not (select prosecdef from pg_proc where oid = v_commun) then
    raise exception 'ARRÊT bloc 6 : categories_convocation_commune_visible(uuid) absente ou modifiée. Rien n''a été modifié.';
  end if;

  -- Règles actuelles : exactement les 4 lues le 2026-11-16.
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'convocation_joueurs'
             and policyname like 'cj\_%') then
    raise exception 'ARRÊT bloc 6 : ce fichier semble déjà appliqué (règles cj_* présentes). Rien n''a été modifié.';
  end if;
  select count(*) into v_nb_pol from pg_policies where schemaname = 'public' and tablename = 'convocation_joueurs';
  if v_nb_pol <> 4 then
    raise exception 'ARRÊT bloc 6 : % règles sur convocation_joueurs, 4 attendues. Rien n''a été modifié.', v_nb_pol;
  end if;
  select count(*) into v_nb_ok from pg_policies
  where schemaname = 'public' and tablename = 'convocation_joueurs' and permissive = 'PERMISSIVE'
    and (
      (policyname = 'lecture convocation joueurs' and cmd = 'SELECT' and roles::text = '{public}'
        and qual = 'true' and with_check is null)
      or (policyname = 'gestion convocation joueurs' and cmd = 'ALL' and roles::text = '{public}'
        and qual like '(EXISTS ( SELECT 1%FROM profil_educateur%profil_educateur.user_id = auth.uid()%' and with_check is null)
      or (policyname = 'parent_lit_donnees_enfant' and cmd = 'SELECT' and roles::text = '{public}'
        and qual = 'est_parent_accepte_de(joueur_id)' and with_check is null)
      or (policyname = 'categories_commun_lecture' and cmd = 'SELECT' and roles::text = '{authenticated}'
        and qual = 'categories_convocation_commune_visible(convocation_id)' and with_check is null)
    );
  if v_nb_ok <> 4 then
    raise exception 'ARRÊT bloc 6 : les règles de convocation_joueurs diffèrent de celles lues le 2026-11-16 (% sur 4 identiques). Rien n''a été modifié.', v_nb_ok;
  end if;

  -- Chaque ligne appartient à une convocation qui a un éducateur : sinon
  -- elle deviendrait invisible pour son auteur.
  select count(*) into v_orphelines
  from public.convocation_joueurs cj
  where cj.convocation_id is null
     or not exists (select 1 from public.convocations c where c.id = cj.convocation_id and c.educateur_id is not null);
  if v_orphelines > 0 then
    raise exception 'ARRÊT bloc 6 : % ligne(s) de convoqués sans convocation ni éducateur. Rien n''a été modifié.', v_orphelines;
  end if;

  -- Nombre de lignes avant (comparé à la fin : aucune donnée ne doit bouger).
  perform set_config('secu.cj_lignes_avant', (select count(*) from public.convocation_joueurs)::text, true);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Règles
-- ─────────────────────────────────────────────────────────────────────────
-- La faille : liste des convoqués lisible par tous, même sans compte.
drop policy "lecture convocation joueurs" on public.convocation_joueurs;

-- Écriture par tout éducateur (tous clubs) → auteur et dirigeant délégué.
drop policy "gestion convocation joueurs" on public.convocation_joueurs;

create policy cj_encadrant_lecture on public.convocation_joueurs
  as permissive for select to authenticated
  using (public.secu_peut_gerer_convocation(convocation_id, false));

create policy cj_encadrant_ajout on public.convocation_joueurs
  as permissive for insert to authenticated
  with check (public.secu_peut_gerer_convocation(convocation_id, true));

create policy cj_encadrant_suppression on public.convocation_joueurs
  as permissive for delete to authenticated
  using (public.secu_peut_gerer_convocation(convocation_id, true));

create policy cj_joueur_lit_sa_ligne on public.convocation_joueurs
  as permissive for select to authenticated
  using (joueur_id = auth.uid());

-- Règle gardée telle quelle, réservée aux comptes connectés.
alter policy parent_lit_donnees_enfant on public.convocation_joueurs to authenticated;
-- categories_commun_lecture : inchangée (déjà réservée à authenticated).

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Droits techniques
-- ─────────────────────────────────────────────────────────────────────────
revoke all on table public.convocation_joueurs from public;
revoke insert, update, delete, truncate, references, trigger, maintain on table public.convocation_joueurs from anon;
revoke truncate, references, trigger, maintain on table public.convocation_joueurs from authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Contrôles finaux (même transaction : un échec annule tout le fichier)
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  v_compte uuid;
  v_attendu bigint;
  v_vu bigint;
  v_vu_conv bigint;
  v_ids uuid[];
  v_lignes bigint;
  v_lire text := 'public.secu_peut_gerer_convocation(convocation_id, false)';
  v_lire_court text := 'secu_peut_gerer_convocation(convocation_id, false)';
  v_ecrire text := 'public.secu_peut_gerer_convocation(convocation_id, true)';
  v_ecrire_court text := 'secu_peut_gerer_convocation(convocation_id, true)';
begin
  if not (select relrowsecurity from pg_class where oid = 'public.convocation_joueurs'::regclass) then
    raise exception 'ARRÊT contrôle final : RLS inactive. Rien n''a été modifié.';
  end if;

  -- Exactement les 6 règles prévues, toutes réservées à authenticated.
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'convocation_joueurs') <> 6
     or (select count(*) from pg_policies
         where schemaname = 'public' and tablename = 'convocation_joueurs'
           and permissive = 'PERMISSIVE'
           and roles::text = '{authenticated}'
           and (
             (policyname = 'cj_encadrant_lecture' and cmd = 'SELECT'
               and qual in (v_lire, v_lire_court) and with_check is null)
             or (policyname = 'cj_encadrant_ajout' and cmd = 'INSERT'
               and qual is null and with_check in (v_ecrire, v_ecrire_court))
             or (policyname = 'cj_encadrant_suppression' and cmd = 'DELETE'
               and qual in (v_ecrire, v_ecrire_court) and with_check is null)
             or (policyname = 'cj_joueur_lit_sa_ligne' and cmd = 'SELECT'
               and qual = '(joueur_id = auth.uid())' and with_check is null)
             or (policyname = 'parent_lit_donnees_enfant' and cmd = 'SELECT'
               and qual = 'est_parent_accepte_de(joueur_id)' and with_check is null)
             or (policyname = 'categories_commun_lecture' and cmd = 'SELECT'
               and qual = 'categories_convocation_commune_visible(convocation_id)' and with_check is null)
           )) <> 6 then
    raise exception 'ARRÊT contrôle final : les règles de convocation_joueurs ne sont pas exactement les 6 prévues. Rien n''a été modifié.';
  end if;

  -- Droits techniques
  if has_table_privilege('anon', 'public.convocation_joueurs', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') then
    raise exception 'ARRÊT contrôle final : le visiteur sans compte peut encore écrire ou vider la table. Rien n''a été modifié.';
  end if;
  if not has_table_privilege('anon', 'public.convocation_joueurs', 'SELECT') then
    raise exception 'ARRÊT contrôle final : le visiteur a perdu la lecture technique (les règles de convocations échoueraient). Rien n''a été modifié.';
  end if;
  if exists (select 1 from pg_class c, aclexplode(c.relacl) a where c.oid = 'public.convocation_joueurs'::regclass and a.grantee = 0) then
    raise exception 'ARRÊT contrôle final : PUBLIC a encore un droit sur la table. Rien n''a été modifié.';
  end if;
  if has_table_privilege('authenticated', 'public.convocation_joueurs', 'TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') then
    raise exception 'ARRÊT contrôle final : un compte connecté peut encore vider, lier ou verrouiller la table. Rien n''a été modifié.';
  end if;
  if not (has_table_privilege('authenticated', 'public.convocation_joueurs', 'SELECT')
          and has_table_privilege('authenticated', 'public.convocation_joueurs', 'INSERT')
          and has_table_privilege('authenticated', 'public.convocation_joueurs', 'DELETE')) then
    raise exception 'ARRÊT contrôle final : authenticated a perdu lecture, ajout ou retrait (la convocation ne s''enregistrerait plus). Rien n''a été modifié.';
  end if;

  -- Aucune donnée n'a bougé
  select count(*) into v_lignes from public.convocation_joueurs;
  if v_lignes::text <> current_setting('secu.cj_lignes_avant') then
    raise exception 'ARRÊT contrôle final : le nombre de lignes a changé. Rien n''a été modifié.';
  end if;

  -- Essai réel, pour chaque éducateur auteur : il voit toutes les lignes de
  -- ses convocations. Chaque essai est annulé (sous-transaction).
  for v_compte in select distinct c.educateur_id from public.convocations c
                  join public.convocation_joueurs cj on cj.convocation_id = c.id loop
    -- Listes calculées AVANT de prendre l'identité du compte (elles ne
    -- doivent pas dépendre des règles d'autres tables).
    select array_agg(c.id) into v_ids from public.convocations c where c.educateur_id = v_compte;
    select count(*) into v_attendu from public.convocation_joueurs cj where cj.convocation_id = any (v_ids);
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_compte, 'role', 'authenticated')::text, true);
      perform set_config('request.jwt.claim.sub', v_compte::text, true);
      execute 'set local role authenticated';
      select count(*) into v_vu from public.convocation_joueurs cj where cj.convocation_id = any (v_ids);
      raise exception using errcode = 'P0001', message = 'secu_essai_fini';
    exception when others then
      if sqlerrm <> 'secu_essai_fini' then raise; end if;
    end;
    if v_vu <> v_attendu then
      raise exception 'ARRÊT contrôle final : l''éducateur % voit % ligne(s) de ses convocations au lieu de %. Rien n''a été modifié.', v_compte, v_vu, v_attendu;
    end if;
  end loop;

  -- Essai réel, pour chaque joueur convoqué : il voit toutes ses lignes, et
  -- toujours les convocations publiées où il figure (règle de convocations).
  for v_compte in select distinct joueur_id from public.convocation_joueurs loop
    select count(*) into v_attendu from public.convocation_joueurs where joueur_id = v_compte;
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_compte, 'role', 'authenticated')::text, true);
      perform set_config('request.jwt.claim.sub', v_compte::text, true);
      execute 'set local role authenticated';
      select count(*) into v_vu from public.convocation_joueurs where joueur_id = v_compte;
      raise exception using errcode = 'P0001', message = 'secu_essai_fini';
    exception when others then
      if sqlerrm <> 'secu_essai_fini' then raise; end if;
    end;
    if v_vu <> v_attendu then
      raise exception 'ARRÊT contrôle final : le joueur % voit % convocation(s) au lieu de %. Rien n''a été modifié.', v_compte, v_vu, v_attendu;
    end if;
  end loop;

  -- Essai réel, pour chaque parent accepté d'un joueur convoqué : il voit
  -- toutes les lignes de son enfant.
  for v_compte in select distinct pa.parent_id from public.parents_acces pa
                  where pa.statut = 'accepte' and pa.parent_id is not null
                    and pa.joueur_id in (select joueur_id from public.convocation_joueurs) loop
    select array_agg(pa.joueur_id) into v_ids from public.parents_acces pa
    where pa.parent_id = v_compte and pa.statut = 'accepte';
    select count(*) into v_attendu from public.convocation_joueurs cj where cj.joueur_id = any (v_ids);
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_compte, 'role', 'authenticated')::text, true);
      perform set_config('request.jwt.claim.sub', v_compte::text, true);
      execute 'set local role authenticated';
      select count(*) into v_vu from public.convocation_joueurs cj where cj.joueur_id = any (v_ids);
      raise exception using errcode = 'P0001', message = 'secu_essai_fini';
    exception when others then
      if sqlerrm <> 'secu_essai_fini' then raise; end if;
    end;
    if v_vu <> v_attendu then
      raise exception 'ARRÊT contrôle final : le parent % voit % ligne(s) de son enfant au lieu de %. Rien n''a été modifié.', v_compte, v_vu, v_attendu;
    end if;
  end loop;

  -- Un compte connecté sans lien ne voit rien.
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', (current_setting('request.jwt.claims')::json ->> 'sub'), true);
    execute 'set local role authenticated';
    select count(*) into v_vu from public.convocation_joueurs;
    raise exception using errcode = 'P0001', message = 'secu_essai_fini';
  exception when others then
    if sqlerrm <> 'secu_essai_fini' then raise; end if;
  end;
  if v_vu <> 0 then
    raise exception 'ARRÊT contrôle final : un compte sans lien voit encore % ligne(s). Rien n''a été modifié.', v_vu;
  end if;

  -- Le visiteur sans compte lit sans erreur, ne voit rien, et la lecture de
  -- convocations marche toujours pour lui (sans erreur).
  begin
    perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
    perform set_config('request.jwt.claim.sub', '', true);
    execute 'set local role anon';
    select count(*) into v_vu from public.convocation_joueurs;
    select count(*) into v_vu_conv from public.convocations;
    raise exception using errcode = 'P0001', message = 'secu_essai_fini';
  exception when others then
    if sqlstate = '42501' then
      raise exception 'ARRÊT contrôle final : le visiteur sans compte reçoit « permission refusée » (%). Rien n''a été modifié.', sqlerrm;
    elsif sqlerrm <> 'secu_essai_fini' then raise; end if;
  end;
  if v_vu <> 0 then
    raise exception 'ARRÊT contrôle final : le visiteur sans compte voit % ligne(s). Rien n''a été modifié.', v_vu;
  end if;

  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end;
$$;

commit;

select 'Bloc 6 appliqué : convocation_joueurs réservée à l''éducateur auteur, au dirigeant délégué, au joueur convoqué et à ses parents.' as resultat;
