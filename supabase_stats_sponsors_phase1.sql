-- ════════════════════════════════════════════════════════════════════════
-- STATISTIQUES SPONSORS — Phase 1 (club + stages). Tournois : volontairement
-- hors scope (aucun système de sponsor n'existe encore pour les tournois),
-- phase 2 à part.
--
-- Objectif : donner au club (et à son staff avec permission "sponsors",
-- rôles marketing/secrétaire inclus — cf. role_permissions) des chiffres
-- défendables pour vendre ses emplacements publicitaires : IMPRESSIONS
-- (visites), CLICS par sponsor, CTR = clics/impressions, sur jour/semaine/
-- mois/trimestre/année — pour la vue globale du club et, séparément, pour
-- chaque stage qui a ses propres sponsors.
--
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE. Transactionnel (begin/commit),
-- additif : ne supprime ni ne modifie aucune donnée existante, ne remplace
-- aucune policy existante (seule la contrainte CHECK de connexions_log.role
-- est élargie, et stage_public() est redéfinie pour exposer un id de plus
-- par sponsor — rien d'autre n'est retiré).
--
-- Dépend de scripts déjà présents mais pas encore exécutés (à exécuter
-- avant ou en même temps si ce n'est pas déjà fait) :
--   - supabase_sponsors_clics.sql          (table sponsor_clics_log)
--   - supabase_sponsors_phase1_fonctions_rpc.sql (fonction sponsors_peut_acceder)
--   - supabase_stages_etape1.sql à etape4.sql (tables stages/stages_sponsors,
--     fonction peut_gerer_stages, fonction stage_public)
-- Si l'une de ces dépendances n'est pas en base, les CREATE ci-dessous
-- échoueront avec un message clair (table/fonction inexistante) — aucune
-- modification partielle à craindre grâce au begin/commit global.
-- ════════════════════════════════════════════════════════════════════════

begin;

-- ────────────────────────────────────────────────────────────────────────
-- 0. DIAGNOSTIC (lecture seule) — à lancer d'abord séparément si tu veux
-- vérifier le nom réel de la contrainte CHECK avant de l'élargir ci-dessous.
-- ────────────────────────────────────────────────────────────────────────
-- select conname, pg_get_constraintdef(oid) from pg_constraint
-- where conrelid = 'public.connexions_log'::regclass and contype = 'c';

-- ────────────────────────────────────────────────────────────────────────
-- 1. connexions_log : ajouter le rôle 'club' (le dashboard club ne logue
-- rien aujourd'hui — aucune ligne 'club' n'existe, donc élargir le CHECK
-- est sans risque pour les lignes existantes). Nom de contrainte par défaut
-- Postgres pour "role text ... check (role in (...))" sur une table créée
-- sans contrainte nommée explicitement.
-- ────────────────────────────────────────────────────────────────────────
alter table public.connexions_log drop constraint if exists connexions_log_role_check;
alter table public.connexions_log add constraint connexions_log_role_check
  check (role in ('joueur', 'educateur', 'club'));

-- La policy existante (connexions_log_insert_self, WITH CHECK auth.uid() =
-- user_id) couvre le président qui se connecte avec son propre compte
-- (user_id = resolvedClubId = auth.uid()). Elle NE couvre PAS un membre du
-- staff_club (user.id différent du club) qui ouvre le même dashboard —
-- cf. DashboardClub.jsx, resolvedClubId = staffRow.club_id quand ce n'est
-- pas le président. Sans ceci, la visite d'un membre du staff ne serait
-- jamais comptée dans l'audience du club. Policy additive, ne retire rien :
-- une ligne 'club' peut être insérée soit par le club lui-même, soit par un
-- membre de son staff_club, toujours au nom du club (user_id = club_id, pas
-- l'identité du staff).
drop policy if exists "connexions_log_insert_staff_club" on public.connexions_log;
create policy "connexions_log_insert_staff_club" on public.connexions_log
  for insert to authenticated
  with check (
    role = 'club'
    and exists (select 1 from public.staff_club sc where sc.club_id = connexions_log.user_id and sc.user_id = auth.uid())
  );

-- ────────────────────────────────────────────────────────────────────────
-- 2. Audience du dashboard club (impressions) — agrégation EN BASE, pas de
-- nouvelle policy SELECT large sur connexions_log.
--
-- Pourquoi une RPC et pas une policy SELECT supplémentaire (comme le
-- ferait le pattern "Viewers.jsx" déjà en place) : la policy existante de
-- connexions_log limite la lecture au joueur lui-même ou à SON éducateur
-- affilié — exactement pour ne pas exposer l'activité individuelle d'un
-- joueur à n'importe qui d'autre. sponsors_peut_acceder() autorise aussi
-- un rôle "marketing" ou "secrétaire" (role_permissions, section
-- 'sponsors') qui n'a aucune raison de voir le détail joueur par joueur de
-- Viewers — seulement un total agrégé par jour. On agrège donc ici, et on
-- ne renvoie jamais de user_id individuel.
create or replace function public.sponsors_audience_stats(p_club_id uuid, p_depuis timestamptz)
returns table (jour date, role text, nb bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select date_trunc('day', cl.created_at)::date as jour, cl.role, count(*) as nb
  from public.connexions_log cl
  where public.sponsors_peut_acceder(p_club_id, false)
    and cl.created_at >= p_depuis
    and (
      (cl.role = 'club' and cl.user_id = p_club_id)
      or (cl.role = 'educateur' and exists (
            select 1 from public.club_educateurs ce
            where ce.club_id = p_club_id and ce.educateur_id = cl.user_id and ce.statut = 'accepte'))
      or (cl.role = 'joueur' and exists (
            select 1 from public.affiliations a
            join public.club_educateurs ce on ce.educateur_id = a.educateur_id
            where ce.club_id = p_club_id and a.joueur_id = cl.user_id
              and a.statut = 'accepte' and ce.statut = 'accepte'))
    )
  group by 1, 2
$$;
revoke execute on function public.sponsors_audience_stats(uuid, timestamptz) from public, anon;
grant execute on function public.sponsors_audience_stats(uuid, timestamptz) to authenticated;

-- ────────────────────────────────────────────────────────────────────────
-- 3. Stages : vues de la page publique + clics par sponsor de stage.
--
-- Tables de log append-only, même esprit que connexions_log/sponsor_clics_log.
-- Écriture UNIQUEMENT via les deux RPC ci-dessous (p_lien, pas p_stage_id) :
-- la page StagePublic est accessible sans compte (parents non connectés),
-- donc il n'y a pas d'auth.uid() fiable pour une policy INSERT classique —
-- la RPC elle-même revalide que le stage existe, est publié (statut <>
-- 'brouillon', même règle que stage_public()) et, pour un clic, que le
-- sponsor appartient bien à ce stage et est actif.
-- ────────────────────────────────────────────────────────────────────────
create table if not exists public.stage_vues_log (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.stage_vues_log enable row level security;
revoke all on public.stage_vues_log from anon, authenticated;

drop policy if exists "stage_vues_log_select" on public.stage_vues_log;
create policy "stage_vues_log_select" on public.stage_vues_log
  for select to authenticated
  using (exists (select 1 from public.stages s where s.id = stage_vues_log.stage_id and public.peut_gerer_stages(s.club_id)));

create table if not exists public.stage_sponsor_clics_log (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages(id) on delete cascade,
  sponsor_id uuid not null references public.stages_sponsors(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.stage_sponsor_clics_log enable row level security;
revoke all on public.stage_sponsor_clics_log from anon, authenticated;

drop policy if exists "stage_sponsor_clics_log_select" on public.stage_sponsor_clics_log;
create policy "stage_sponsor_clics_log_select" on public.stage_sponsor_clics_log
  for select to authenticated
  using (exists (select 1 from public.stages s where s.id = stage_sponsor_clics_log.stage_id and public.peut_gerer_stages(s.club_id)));

create index if not exists idx_stage_vues_log_stage on public.stage_vues_log(stage_id, created_at);
create index if not exists idx_stage_sponsor_clics_log_stage on public.stage_sponsor_clics_log(stage_id, created_at);
create index if not exists idx_stage_sponsor_clics_log_sponsor on public.stage_sponsor_clics_log(sponsor_id, created_at);

create or replace function public.loguer_vue_stage(p_lien text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_stage_id uuid;
begin
  select id into v_stage_id from stages where lien_public = p_lien and statut <> 'brouillon';
  if v_stage_id is not null then
    insert into stage_vues_log (stage_id) values (v_stage_id);
  end if;
end;
$$;
revoke execute on function public.loguer_vue_stage(text) from public;
grant execute on function public.loguer_vue_stage(text) to anon, authenticated;

create or replace function public.loguer_clic_sponsor_stage(p_lien text, p_sponsor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_stage_id uuid;
begin
  select s.id into v_stage_id
  from stages s
  join stages_sponsors sp on sp.stage_id = s.id and sp.id = p_sponsor_id and sp.actif
  where s.lien_public = p_lien and s.statut <> 'brouillon';
  if v_stage_id is not null then
    insert into stage_sponsor_clics_log (stage_id, sponsor_id) values (v_stage_id, p_sponsor_id);
  end if;
end;
$$;
revoke execute on function public.loguer_clic_sponsor_stage(text, uuid) from public;
grant execute on function public.loguer_clic_sponsor_stage(text, uuid) to anon, authenticated;

-- Pas de RPC d'agrégation ici, volontairement : contrairement à
-- connexions_log (section 2), stage_vues_log et stage_sponsor_clics_log ne
-- contiennent aucune donnée personnelle (visiteur anonyme, juste un
-- timestamp) — la policy SELECT posée plus haut (peut_gerer_stages) suffit,
-- le client peut lire les lignes brutes et les agréger lui-même, même
-- pattern que sponsor_clics_log côté club (StatsSponsors.jsx).

-- ────────────────────────────────────────────────────────────────────────
-- 4. stage_public() : redéfinition minimale pour exposer l'id de chaque
-- sponsor (absent aujourd'hui, cf. supabase_stages_etape4.sql) — sans lui,
-- le clic public ne peut pas dire QUEL sponsor a été cliqué.
-- Corps identique à supabase_stages_etape4.sql, seul ajout : 'id', sp.id
-- dans l'objet sponsor. Si ce fichier a changé depuis l'écriture de ce
-- script, cette redéfinition écrasera ces changements — à relire avant
-- d'exécuter si stage_public() a bougé.
-- ────────────────────────────────────────────────────────────────────────
create or replace function public.stage_public(p_lien text)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'nom', s.nom, 'description', s.description,
    'date_debut', s.date_debut, 'date_fin', s.date_fin, 'lieu', s.lieu,
    'places_max', s.places_max, 'prix_inscription', s.prix_inscription,
    'statut', s.statut, 'reglement', s.reglement, 'liste_materiel', s.liste_materiel,
    'image_url', s.image_url,
    'modes_paiement', s.modes_paiement, 'instructions_paiement', s.instructions_paiement,
    'club_nom', p.club, 'club_couleur', p.couleur_principale, 'club_avatar', p.avatar_url,
    'planning', coalesce((
      select jsonb_agg(jsonb_build_object(
               'date', pl.date, 'heure_debut', pl.heure_debut, 'heure_fin', pl.heure_fin,
               'activite', pl.activite, 'lieu', pl.lieu, 'responsable', pl.responsable,
               'groupe', pl.groupe, 'couleur', pl.couleur)
             order by pl.date, pl.heure_debut)
      from stages_planning pl where pl.stage_id = s.id), '[]'::jsonb),
    'offres', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'nom', o.nom, 'type', o.type, 'nb_jours', o.nb_jours, 'prix', o.prix)
             order by o.ordre, o.prix)
      from stages_offres o where o.stage_id = s.id and o.actif), '[]'::jsonb),
    'formules_repas', coalesce((
      select jsonb_agg(jsonb_build_object('id', f.id, 'nom', f.nom, 'prix_jour', f.prix_jour)
             order by f.ordre, f.prix_jour)
      from stages_formules_repas f where f.stage_id = s.id and f.actif), '[]'::jsonb),
    'jours', coalesce((
      select jsonb_agg(jsonb_build_object(
               'date', j,
               'places_restantes', greatest(s.places_max - (
                 select count(*) from stages_inscriptions i
                 where i.stage_id = s.id and i.statut_paiement <> 'annule' and j = any(i.jours)), 0))
             order by j)
      from unnest(stage_jours(s.date_debut, s.date_fin, s.jours)) j), '[]'::jsonb),
    'posts', coalesce((
      select jsonb_agg(jsonb_build_object('type', po.type, 'titre', po.titre, 'contenu', po.contenu,
                                          'image_url', po.image_url, 'created_at', po.created_at)
             order by po.created_at desc)
      from stages_posts po where po.stage_id = s.id and po.visible), '[]'::jsonb),
    'sponsors', coalesce((
      select jsonb_agg(jsonb_build_object('id', sp.id, 'nom', sp.nom, 'logo_url', sp.logo_url, 'lien_url', sp.lien_url, 'message', sp.message)
             order by sp.montant desc nulls last, sp.created_at)
      from stages_sponsors sp where sp.stage_id = s.id and sp.actif), '[]'::jsonb)
  )
  from stages s
  join profiles p on p.id = s.club_id
  where s.lien_public = p_lien and s.statut <> 'brouillon';
$$;
revoke execute on function public.stage_public(text) from public;
grant execute on function public.stage_public(text) to anon, authenticated;

commit;

-- ════════════════════════════════════════════════════════════════════════
-- TESTS FONCTIONNELS / SÉCURITÉ suggérés (à adapter avec de vrais IDs, à
-- lancer séparément après exécution — non inclus dans la transaction
-- ci-dessus pour rester simple) :
--
-- 1. select loguer_vue_stage('<lien_public_d_un_stage_publie>');
--    puis select count(*) from stage_vues_log; -- doit être +1
-- 2. En tant que club A : select * from sponsors_audience_stats('<club_B_id>', now() - interval '30 days');
--    -- doit renvoyer 0 ligne (sponsors_peut_acceder refuse club_B au club A)
-- 3. En tant que club A, sur SON propre id : doit renvoyer les lignes agrégées,
--    jamais de colonne user_id dans le résultat (vérifier la forme de la table).
-- 4. select loguer_clic_sponsor_stage('<lien>', '<id d un sponsor d un AUTRE stage>');
--    puis vérifier qu'aucune ligne n'a été insérée (jointure stage_id/sponsor_id échoue).
-- ════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════
-- ROLLBACK (NE PAS EXÉCUTER CE BLOC TEL QUEL — pour référence uniquement,
-- cf. règle : pas de rollback prêt à lancer. Décommenter ligne par ligne,
-- dans cet ordre, après avoir confirmé que rien n'en dépend encore) :
--
-- drop function if exists public.stage_sponsor_stats(uuid, timestamptz);
-- drop function if exists public.loguer_clic_sponsor_stage(text, uuid);
-- drop function if exists public.loguer_vue_stage(text);
-- drop table if exists public.stage_sponsor_clics_log;
-- drop table if exists public.stage_vues_log;
-- drop function if exists public.sponsors_audience_stats(uuid, timestamptz);
-- alter table public.connexions_log drop constraint if exists connexions_log_role_check;
-- alter table public.connexions_log add constraint connexions_log_role_check check (role in ('joueur', 'educateur'));
--   (supprimerait aussi la possibilité de relire les lignes role='club' déjà
--    insérées tant que le JS qui les écrit n'est pas lui-même retiré)
-- -- stage_public() : revenir à la version de supabase_stages_etape4.sql
-- -- (recoller son corps tel quel, sans 'id', sp.id)
-- ════════════════════════════════════════════════════════════════════════
