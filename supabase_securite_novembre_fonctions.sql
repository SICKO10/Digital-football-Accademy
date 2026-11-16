-- Chantier sécurité de novembre — BLOC 2 : fonctions de droits (ajout pur).
--
-- Ce fichier NE FERME RIEN : il ajoute 7 fonctions de droits, aucune règle
-- (policy) ni aucun droit sur une table n'est touché. Tant que les blocs 3,
-- 5, 6 et 7 ne sont pas appliqués, aucun accès ne change.
--
-- Référence : section « Matrice » de PLAN-securite-novembre.md (validée par
-- Kevin le 2026-11-14) et règles réelles lues dans pg_policies le 2026-11-16.
--
-- Choix communs aux 7 fonctions :
--   - SECURITY DEFINER + search_path vide : elles lisent les tables liées
--     sans passer par leurs règles (évite la boucle convocations ↔
--     convocation_joueurs), tout objet est écrit avec son schéma ;
--   - compte club reconnu seulement si profiles.plan = 'club' (même règle que
--     sponsors_peut_acceder et DashboardClub ; vérifié le 2026-11-16 : les 7
--     clubs propriétaires de données sont tous en plan 'club') ;
--   - membre du staff avec un rôle vide : refusé partout (l'écran le traite
--     comme président, la base non) ;
--   - auth.uid() vide (visiteur sans compte) : toujours « non » ;
--   - exécutables par authenticated seulement (ni anon, ni PUBLIC).
--
-- Garde-fous : arrêt sans rien créer si le schéma réel diffère, ou si une
-- fonction de même nom existe sans le marqueur de ce fichier.
-- Contrôles finaux dans la même transaction : un seul échec annule tout.
-- Rejouable : le marqueur autorise le remplacement des seules fonctions
-- créées par ce fichier.
--
-- Retrait : supabase_securite_novembre_fonctions_SECOURS_NE_PAS_EXECUTER.sql

begin;

set local check_function_bodies = on;

-- ─────────────────────────────────────────────────────────────────────────
-- 0. Garde-fous (lecture seule : une exception annule tout, rien n'est créé)
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  v_manquants text[] := array[]::text[];
  v_attendu record;
  v_type text;
  v_fonction text;
  v_commentaire text;
begin
  for v_attendu in
    select * from (values
      ('profiles', 'id', 'uuid'),
      ('profiles', 'plan', 'text'),
      ('profiles', 'prenom', 'text'),
      ('profiles', 'nom', 'text'),
      ('staff_club', 'id', 'uuid'),
      ('staff_club', 'club_id', 'uuid'),
      ('staff_club', 'user_id', 'uuid'),
      ('staff_club', 'role', 'text'),
      ('staff_club', 'created_at', 'timestamp'),
      ('role_permissions', 'club_id', 'uuid'),
      ('role_permissions', 'role', 'text'),
      ('role_permissions', 'section', 'text'),
      ('role_permissions', 'can_view', 'bool'),
      ('role_permissions', 'can_edit', 'bool'),
      ('club_categories', 'id', 'uuid'),
      ('club_categories', 'club_id', 'uuid'),
      ('club_categories', 'educateur_id', 'uuid'),
      ('club_educateurs', 'club_id', 'uuid'),
      ('club_educateurs', 'educateur_id', 'uuid'),
      ('club_educateurs', 'statut', 'text'),
      ('dirigeant_acces', 'educateur_id', 'uuid'),
      ('dirigeant_acces', 'dirigeant_id', 'uuid'),
      ('dirigeant_acces', 'statut', 'text'),
      ('dirigeant_acces', 'permissions', 'jsonb'),
      ('affiliations', 'educateur_id', 'uuid'),
      ('affiliations', 'joueur_id', 'uuid'),
      ('affiliations', 'statut', 'text'),
      ('parents_acces', 'parent_id', 'uuid'),
      ('parents_acces', 'joueur_id', 'uuid'),
      ('parents_acces', 'statut', 'text'),
      ('convocations', 'id', 'uuid'),
      ('convocations', 'educateur_id', 'uuid')
    ) as t(table_name, column_name, type_attendu)
  loop
    v_type := null;
    select c.udt_name into v_type
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = v_attendu.table_name
      and c.column_name = v_attendu.column_name;

    if v_type is null then
      v_manquants := array_append(v_manquants, format('%s.%s absente', v_attendu.table_name, v_attendu.column_name));
    elsif v_attendu.type_attendu = 'text' and v_type not in ('text', 'varchar', 'bpchar') then
      v_manquants := array_append(v_manquants, format('%s.%s de type %s (texte attendu)', v_attendu.table_name, v_attendu.column_name, v_type));
    elsif v_attendu.type_attendu <> 'text' and v_type <> v_attendu.type_attendu then
      v_manquants := array_append(v_manquants, format('%s.%s de type %s (%s attendu)', v_attendu.table_name, v_attendu.column_name, v_type, v_attendu.type_attendu));
    end if;
  end loop;

  if array_length(v_manquants, 1) > 0 then
    raise exception 'ARRÊT bloc 2 : schéma différent de l''état attendu : %. Rien n''a été modifié.', array_to_string(v_manquants, ' ; ');
  end if;

  foreach v_fonction in array array[
    'public.secu_club_ou_president(uuid)',
    'public.secu_club_ou_staff(uuid)',
    'public.secu_staff_annuaire(uuid)',
    'public.secu_club_peut_editer_section(uuid, text, text[])',
    'public.secu_peut_gerer_convocation(uuid, boolean)',
    'public.secu_peut_lire_seance(uuid, uuid)',
    'public.secu_peut_ecrire_seance(uuid, uuid, text)'
  ] loop
    if to_regprocedure(v_fonction) is not null then
      v_commentaire := obj_description(to_regprocedure(v_fonction), 'pg_proc');
      if v_commentaire is null or v_commentaire not like 'digital-football:securite-novembre-v1%' then
        raise exception 'ARRÊT bloc 2 : % existe déjà et n''a pas été créée par ce fichier. Rien n''a été modifié.', v_fonction;
      end if;
    end if;
  end loop;

  -- Aucune autre fonction secu_* (autre signature) ne doit exister.
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'secu\_%'
      and coalesce(obj_description(p.oid, 'pg_proc'), '') not like 'digital-football:securite-novembre-v1%'
  ) then
    raise exception 'ARRÊT bloc 2 : une fonction public.secu_* inconnue existe déjà. Rien n''a été modifié.';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Club ou président : role_categories_access (tout) et écritures de
--    staff_club.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.secu_club_ou_president(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and p_club_id is not null
    and (
      (
        p_club_id = auth.uid()
        and exists (select 1 from public.profiles pr where pr.id = p_club_id and pr.plan = 'club')
      )
      or exists (
        select 1 from public.staff_club sc
        where sc.club_id = p_club_id
          and sc.user_id = auth.uid()
          and sc.role = 'president'
      )
    )
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Club ou n'importe quel membre de son staff (rôle renseigné) : lecture
--    des séances par le club, accès à l'annuaire.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.secu_club_ou_staff(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and p_club_id is not null
    and (
      (
        p_club_id = auth.uid()
        and exists (select 1 from public.profiles pr where pr.id = p_club_id and pr.plan = 'club')
      )
      or exists (
        select 1 from public.staff_club sc
        where sc.club_id = p_club_id
          and sc.user_id = auth.uid()
          and sc.role is not null
      )
    )
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Annuaire du staff : collègues sans email ni téléphone. Vide pour qui
--    n'est ni le club ni membre de son staff.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.secu_staff_annuaire(p_club_id uuid)
returns table (
  id uuid,
  club_id uuid,
  user_id uuid,
  role text,
  prenom text,
  nom text,
  created_at timestamp
)
language sql
stable
security definer
set search_path = ''
as $$
  select sc.id, sc.club_id, sc.user_id, sc.role::text, pr.prenom::text, pr.nom::text, sc.created_at
  from public.staff_club sc
  left join public.profiles pr on pr.id = sc.user_id
  where sc.club_id = p_club_id
    and public.secu_club_ou_staff(p_club_id)
  order by sc.created_at desc
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Droit d'édition d'une section du club : même calcul que canEditSection
--    (DashboardClub.jsx) : club ou président ; sinon la ligne role_permissions
--    du rôle fait foi (voir ET modifier) ; à défaut de ligne, rôles par défaut
--    (PERMISSION_DEFAULTS de src/lib/permissionsClub.js, passés en paramètre).
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.secu_club_peut_editer_section(p_club_id uuid, p_section text, p_roles_defaut text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and p_club_id is not null
    and p_section is not null
    and (
      (
        p_club_id = auth.uid()
        and exists (select 1 from public.profiles pr where pr.id = p_club_id and pr.plan = 'club')
      )
      or exists (
        select 1 from public.staff_club sc
        where sc.club_id = p_club_id
          and sc.user_id = auth.uid()
          and sc.role is not null
          and (
            sc.role = 'president'
            or exists (
              select 1 from public.role_permissions rp
              where rp.club_id = p_club_id
                and rp.role = sc.role
                and rp.section = p_section
                and coalesce(rp.can_view, false)
                and coalesce(rp.can_edit, false)
            )
            or (
              sc.role = any (coalesce(p_roles_defaut, array[]::text[]))
              and not exists (
                select 1 from public.role_permissions rp2
                where rp2.club_id = p_club_id
                  and rp2.role = sc.role
                  and rp2.section = p_section
              )
            )
          )
      )
    )
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Gestion d'une convocation (pour convocation_joueurs) : éducateur auteur,
--    ou dirigeant délégué selon son droit « compétition » (lecture : lecture
--    ou édition ; écriture : édition). Lit convocations sans ses règles, ce
--    qui évite la boucle avec les règles de convocations.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.secu_peut_gerer_convocation(p_convocation_id uuid, p_edition boolean)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1 from public.convocations c
      where c.id = p_convocation_id
        and c.educateur_id is not null
        and (
          c.educateur_id = auth.uid()
          or exists (
            select 1 from public.dirigeant_acces da
            where da.educateur_id = c.educateur_id
              and da.dirigeant_id = auth.uid()
              and da.statut = 'accepte'
              and (da.permissions ->> 'competition') = any (
                case when coalesce(p_edition, true) then array['edition'] else array['lecture', 'edition'] end
              )
          )
        )
    )
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Lecture d'une séance (entrainements) : auteur, éducateur de l'équipe,
--    dirigeant (droit « entraînements » lecture ou édition), club et tout son
--    staff (équipe du club, ou séance sans équipe d'un éducateur accepté du
--    club), joueur affilié accepté de l'éducateur, parent accepté de ce joueur.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.secu_peut_lire_seance(p_educateur_id uuid, p_equipe_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and (
      p_educateur_id = auth.uid()
      or (
        p_equipe_id is not null
        and exists (
          select 1 from public.club_categories cc
          where cc.id = p_equipe_id and cc.educateur_id = auth.uid()
        )
      )
      or exists (
        select 1 from public.dirigeant_acces da
        where da.educateur_id = p_educateur_id
          and da.dirigeant_id = auth.uid()
          and da.statut = 'accepte'
          and (da.permissions ->> 'entrainements') in ('lecture', 'edition')
      )
      or (
        p_equipe_id is not null
        and exists (
          select 1 from public.club_categories cc
          where cc.id = p_equipe_id and public.secu_club_ou_staff(cc.club_id)
        )
      )
      or (
        p_equipe_id is null
        and exists (
          select 1 from public.club_educateurs ce
          where ce.educateur_id = p_educateur_id
            and ce.statut = 'accepte'
            and public.secu_club_ou_staff(ce.club_id)
        )
      )
      or exists (
        select 1 from public.affiliations a
        where a.educateur_id = p_educateur_id
          and a.joueur_id = auth.uid()
          and a.statut = 'accepte'
      )
      or exists (
        select 1
        from public.parents_acces pa
        join public.affiliations a on a.joueur_id = pa.joueur_id
        where pa.parent_id = auth.uid()
          and pa.statut = 'accepte'
          and a.educateur_id = p_educateur_id
          and a.statut = 'accepte'
      )
    )
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 7. Écriture d'une séance. p_operation : 'insert', 'update' ou 'delete'.
--    - auteur (pour lui-même) et dirigeant « entraînements » en édition :
--      les trois ;
--    - éducateur de l'équipe : modifier seulement ;
--    - club, président, ou rôle ayant « Séances » en édition (défaut :
--      directeur sportif), pour une équipe du club : créer (au nom de
--      l'éducateur de l'équipe, comme PlanificationSeances.jsx) et supprimer.
--      Jamais modifier (aucun écran).
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.secu_peut_ecrire_seance(p_educateur_id uuid, p_equipe_id uuid, p_operation text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and p_operation in ('insert', 'update', 'delete')
    and (
      p_educateur_id = auth.uid()
      or exists (
        select 1 from public.dirigeant_acces da
        where da.educateur_id = p_educateur_id
          and da.dirigeant_id = auth.uid()
          and da.statut = 'accepte'
          and (da.permissions ->> 'entrainements') = 'edition'
      )
      or (
        p_operation = 'update'
        and p_equipe_id is not null
        and exists (
          select 1 from public.club_categories cc
          where cc.id = p_equipe_id and cc.educateur_id = auth.uid()
        )
      )
      or (
        p_operation in ('insert', 'delete')
        and p_equipe_id is not null
        and exists (
          select 1 from public.club_categories cc
          where cc.id = p_equipe_id
            and (p_operation = 'delete' or cc.educateur_id = p_educateur_id)
            and public.secu_club_peut_editer_section(cc.club_id, 'seances', array['president', 'directeur_sportif'])
        )
      )
    )
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 8. Marqueurs de version (autorisent la ré-exécution, cf. garde-fou 0).
-- ─────────────────────────────────────────────────────────────────────────
comment on function public.secu_club_ou_president(uuid) is
  'digital-football:securite-novembre-v1 — club (plan club) ou président de son staff';
comment on function public.secu_club_ou_staff(uuid) is
  'digital-football:securite-novembre-v1 — club (plan club) ou membre de son staff (rôle renseigné)';
comment on function public.secu_staff_annuaire(uuid) is
  'digital-football:securite-novembre-v1 — annuaire du staff sans email ni téléphone, club et staff seulement';
comment on function public.secu_club_peut_editer_section(uuid, text, text[]) is
  'digital-football:securite-novembre-v1 — droit d''édition d''une section (même calcul que canEditSection)';
comment on function public.secu_peut_gerer_convocation(uuid, boolean) is
  'digital-football:securite-novembre-v1 — auteur de la convocation ou dirigeant selon son droit compétition';
comment on function public.secu_peut_lire_seance(uuid, uuid) is
  'digital-football:securite-novembre-v1 — lecture d''une séance (matrice entrainements)';
comment on function public.secu_peut_ecrire_seance(uuid, uuid, text) is
  'digital-football:securite-novembre-v1 — écriture d''une séance (insert, update, delete ; matrice entrainements)';

-- ─────────────────────────────────────────────────────────────────────────
-- 9. Droits d'exécution : ni PUBLIC ni anon ; authenticated garde EXECUTE
--    (les règles appellent ces fonctions avec les droits de la personne).
-- ─────────────────────────────────────────────────────────────────────────
revoke all on function public.secu_club_ou_president(uuid) from public, anon;
revoke all on function public.secu_club_ou_staff(uuid) from public, anon;
revoke all on function public.secu_staff_annuaire(uuid) from public, anon;
revoke all on function public.secu_club_peut_editer_section(uuid, text, text[]) from public, anon;
revoke all on function public.secu_peut_gerer_convocation(uuid, boolean) from public, anon;
revoke all on function public.secu_peut_lire_seance(uuid, uuid) from public, anon;
revoke all on function public.secu_peut_ecrire_seance(uuid, uuid, text) from public, anon;

grant execute on function public.secu_club_ou_president(uuid) to authenticated;
grant execute on function public.secu_club_ou_staff(uuid) to authenticated;
grant execute on function public.secu_staff_annuaire(uuid) to authenticated;
grant execute on function public.secu_club_peut_editer_section(uuid, text, text[]) to authenticated;
grant execute on function public.secu_peut_gerer_convocation(uuid, boolean) to authenticated;
grant execute on function public.secu_peut_lire_seance(uuid, uuid) to authenticated;
grant execute on function public.secu_peut_ecrire_seance(uuid, uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 10. Contrôles finaux (même transaction : un échec annule tout le fichier).
-- ─────────────────────────────────────────────────────────────────────────
do $$
declare
  v_fonction text;
  v_oid regprocedure;
  v_proc record;
begin
  foreach v_fonction in array array[
    'public.secu_club_ou_president(uuid)',
    'public.secu_club_ou_staff(uuid)',
    'public.secu_staff_annuaire(uuid)',
    'public.secu_club_peut_editer_section(uuid, text, text[])',
    'public.secu_peut_gerer_convocation(uuid, boolean)',
    'public.secu_peut_lire_seance(uuid, uuid)',
    'public.secu_peut_ecrire_seance(uuid, uuid, text)'
  ] loop
    v_oid := to_regprocedure(v_fonction);
    if v_oid is null then
      raise exception 'ARRÊT contrôle final : % absente. Rien n''a été modifié.', v_fonction;
    end if;
    select p.prosecdef, p.proconfig, p.provolatile into v_proc from pg_proc p where p.oid = v_oid;
    if not v_proc.prosecdef then
      raise exception 'ARRÊT contrôle final : % n''est pas SECURITY DEFINER. Rien n''a été modifié.', v_fonction;
    end if;
    if v_proc.proconfig is distinct from array['search_path=""'] then
      raise exception 'ARRÊT contrôle final : % a un search_path inattendu (%). Rien n''a été modifié.', v_fonction, v_proc.proconfig;
    end if;
    if v_proc.provolatile <> 's' then
      raise exception 'ARRÊT contrôle final : % n''est pas STABLE. Rien n''a été modifié.', v_fonction;
    end if;
    if obj_description(v_oid, 'pg_proc') not like 'digital-football:securite-novembre-v1%' then
      raise exception 'ARRÊT contrôle final : marqueur absent sur %. Rien n''a été modifié.', v_fonction;
    end if;
    if has_function_privilege('anon', v_oid, 'execute') then
      raise exception 'ARRÊT contrôle final : anon peut exécuter %. Rien n''a été modifié.', v_fonction;
    end if;
    if exists (select 1 from pg_proc p, aclexplode(p.proacl) a where p.oid = v_oid and a.grantee = 0) then
      raise exception 'ARRÊT contrôle final : PUBLIC peut exécuter %. Rien n''a été modifié.', v_fonction;
    end if;
    if not has_function_privilege('authenticated', v_oid, 'execute') then
      raise exception 'ARRÊT contrôle final : authenticated ne peut pas exécuter %. Rien n''a été modifié.', v_fonction;
    end if;
  end loop;

  -- Sans compte connecté, toutes les fonctions répondent « non » (ou vide).
  perform set_config('request.jwt.claims', '{}', true);
  perform set_config('request.jwt.claim.sub', '', true);
  if public.secu_club_ou_president('0e341547-f2de-4ac2-9229-4a2b2711652b')
     or public.secu_club_ou_staff('0e341547-f2de-4ac2-9229-4a2b2711652b')
     or public.secu_club_peut_editer_section('0e341547-f2de-4ac2-9229-4a2b2711652b', 'seances', array['president', 'directeur_sportif'])
     or public.secu_peut_lire_seance('75df7fba-40e1-4c93-8902-91d7239c404c', null)
     or public.secu_peut_ecrire_seance('75df7fba-40e1-4c93-8902-91d7239c404c', null, 'insert')
     or exists (select 1 from public.secu_staff_annuaire('0e341547-f2de-4ac2-9229-4a2b2711652b'))
     or exists (select 1 from public.convocations c where public.secu_peut_gerer_convocation(c.id, false))
  then
    raise exception 'ARRÊT contrôle final : une fonction répond « oui » sans compte connecté. Rien n''a été modifié.';
  end if;

  -- Aucune règle ni aucun droit de table n'a été touché par ce fichier :
  -- les 4 tables gardent leurs règles d'aujourd'hui (fermeture aux blocs suivants).
  if (select count(*) from pg_policies where schemaname = 'public'
        and tablename in ('role_categories_access', 'staff_club', 'convocation_joueurs', 'entrainements')) <> 14 then
    raise exception 'ARRÊT contrôle final : le nombre de règles des 4 tables n''est plus 14. Rien n''a été modifié.';
  end if;
end;
$$;

commit;

select 'Bloc 2 appliqué : 7 fonctions secu_* créées, aucune règle modifiée.' as resultat;
