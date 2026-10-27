-- ════════════════════════════════════════════════════════════════════
-- MODULE STAGES — Étape 1 (fondations) : stages + planning + page publique
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE. Faire une sauvegarde avant.
-- Une seule transaction, purement additive : aucune table existante n'est
-- modifiée, aucune donnée existante n'est touchée.
--
-- Écarts volontaires par rapport à la spécification initiale :
--  * club_id référence profiles(id) : il n'existe pas de table « clubs »,
--    un club est une ligne profiles (plan = 'club').
--  * Droits : un stage est géré par le compte club, les membres de son staff
--    autorisés sur la section « stages » (même règle que la matrice des
--    droits du dashboard club, cf. src/lib/permissionsClub.js) et ses
--    éducateurs affiliés ACCEPTÉS — via peut_gerer_stages().
--  * Aucune lecture directe des tables par un visiteur : la page publique
--    passe par la fonction stage_public(lien), qui ne renvoie que les
--    champs publics (jamais les notes internes ni le plan B) et uniquement
--    pour un stage publié (statut différent de « brouillon »). Le lien public
--    reste ainsi secret : impossible de lister les stages.
--  * Inscriptions, budget, tâches, posts, sponsors : étapes suivantes.
-- ════════════════════════════════════════════════════════════════════
begin;

-- ── Droit de gestion des stages d'un club ───────────────────────────
-- Staff : président (ou rôle vide = président, comme dans l'application),
-- sinon la ligne role_permissions(section 'stages') fait foi, sinon la
-- matrice par défaut (directeur_sportif, secretaire) — identique à
-- PERMISSION_DEFAULTS.stages dans src/lib/permissionsClub.js.
create or replace function public.peut_gerer_stages(p_club_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    (auth.uid() = p_club_id and exists (select 1 from profiles where id = p_club_id and plan = 'club'))
    or exists (select 1 from club_educateurs ce
               where ce.club_id = p_club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte')
    or exists (select 1 from staff_club sc
               where sc.club_id = p_club_id and sc.user_id = auth.uid()
                 and (coalesce(sc.role, 'president') = 'president'
                      or coalesce((select rp.can_view and rp.can_edit from role_permissions rp
                                   where rp.club_id = p_club_id and rp.role = sc.role and rp.section = 'stages'),
                                  sc.role in ('directeur_sportif', 'secretaire'))))
  );
$$;
revoke execute on function public.peut_gerer_stages(uuid) from public, anon;
grant execute on function public.peut_gerer_stages(uuid) to authenticated;

-- ── Tables ───────────────────────────────────────────────────────────
create table if not exists public.stages (
  id               uuid primary key default gen_random_uuid(),
  club_id          uuid not null references public.profiles(id) on delete cascade,
  created_by       uuid not null references public.profiles(id),
  nom              text not null,
  description      text,
  date_debut       date not null,
  date_fin         date not null,
  lieu             text,
  places_max       int not null default 20 check (places_max > 0),
  prix_inscription numeric(10,2) not null default 0 check (prix_inscription >= 0),
  statut           text not null default 'brouillon'
                   check (statut in ('brouillon', 'ouvert', 'complet', 'termine')),
  lien_public      text not null unique default replace(gen_random_uuid()::text, '-', ''),
  reglement        text,
  liste_materiel   text,
  image_url        text,
  created_at       timestamptz not null default now(),
  check (date_fin >= date_debut)
);
create index if not exists idx_stages_club_id on public.stages (club_id);

create table if not exists public.stages_planning (
  id          uuid primary key default gen_random_uuid(),
  stage_id    uuid not null references public.stages(id) on delete cascade,
  date        date not null,
  heure_debut time not null,
  heure_fin   time not null,
  activite    text not null,
  lieu        text,
  responsable text,
  groupe      text,
  plan_b      text,   -- interne : jamais renvoyé par stage_public
  notes       text,   -- interne : jamais renvoyé par stage_public
  couleur     text not null default '#4ade80',
  created_at  timestamptz not null default now()
);
create index if not exists idx_stages_planning_stage on public.stages_planning (stage_id, date, heure_debut);

-- ── Règles d'accès ───────────────────────────────────────────────────
alter table public.stages enable row level security;
alter table public.stages_planning enable row level security;

drop policy if exists "stages_gestion_lecture" on public.stages;
create policy "stages_gestion_lecture" on public.stages
  for select to authenticated using (public.peut_gerer_stages(club_id));

drop policy if exists "stages_gestion_creation" on public.stages;
create policy "stages_gestion_creation" on public.stages
  for insert to authenticated
  with check (public.peut_gerer_stages(club_id) and created_by = auth.uid());

drop policy if exists "stages_gestion_modification" on public.stages;
create policy "stages_gestion_modification" on public.stages
  for update to authenticated
  using (public.peut_gerer_stages(club_id)) with check (public.peut_gerer_stages(club_id));

drop policy if exists "stages_gestion_suppression" on public.stages;
create policy "stages_gestion_suppression" on public.stages
  for delete to authenticated using (public.peut_gerer_stages(club_id));

drop policy if exists "stages_planning_gestion" on public.stages_planning;
create policy "stages_planning_gestion" on public.stages_planning
  for all to authenticated
  using (exists (select 1 from public.stages s where s.id = stage_id and public.peut_gerer_stages(s.club_id)))
  with check (exists (select 1 from public.stages s where s.id = stage_id and public.peut_gerer_stages(s.club_id)));

revoke all on public.stages, public.stages_planning from anon;
revoke truncate, references, trigger on public.stages, public.stages_planning from authenticated;

-- ── Page publique (visiteurs sans compte) ───────────────────────────
-- Renvoie null si le lien est inconnu ou si le stage est encore en brouillon.
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
    'club_nom', p.club, 'club_couleur', p.couleur_principale, 'club_avatar', p.avatar_url,
    'planning', coalesce((
      select jsonb_agg(jsonb_build_object(
               'date', pl.date, 'heure_debut', pl.heure_debut, 'heure_fin', pl.heure_fin,
               'activite', pl.activite, 'lieu', pl.lieu, 'responsable', pl.responsable,
               'groupe', pl.groupe, 'couleur', pl.couleur)
             order by pl.date, pl.heure_debut)
      from stages_planning pl where pl.stage_id = s.id), '[]'::jsonb)
  )
  from stages s
  join profiles p on p.id = s.club_id
  where s.lien_public = p_lien and s.statut <> 'brouillon';
$$;
revoke execute on function public.stage_public(text) from public;
grant execute on function public.stage_public(text) to anon, authenticated;

commit;
