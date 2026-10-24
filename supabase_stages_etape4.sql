-- ════════════════════════════════════════════════════════════════════
-- MODULE STAGES — Étape 4 : actualités, photos, objets oubliés, sponsors,
-- organisation (matériel, encadrants, tâches)
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE. Faire une sauvegarde avant.
-- Prérequis : étapes 1 à 3 appliquées. Une seule transaction, additive.
-- S'annule si les tables posts / sponsors / tâches (fermées depuis le
-- correctif de l'étape 1) contiennent déjà des lignes.
--
-- Accès : tout est géré par l'équipe du stage (peut_gerer_stages). Le
-- public ne voit, via stage_public(), que les publications visibles et les
-- sponsors actifs — jamais le montant d'un sponsor, ni l'organisation
-- interne (matériel, encadrants, tâches).
-- ════════════════════════════════════════════════════════════════════
begin;

do $$
begin
  if exists (select 1 from public.stages_posts) or exists (select 1 from public.stages_sponsors)
     or exists (select 1 from public.stages_taches) then
    raise exception 'Étape 4 annulée : des publications, sponsors ou tâches existent déjà. Rien n''a été modifié.';
  end if;
end $$;

-- ── Publications (actualités, photos, objets oubliés / retrouvés) ───
alter table public.stages_posts alter column visible set not null;
alter table public.stages_posts drop constraint if exists stages_posts_type_valide;
alter table public.stages_posts add constraint stages_posts_type_valide
  check (type in ('actualite', 'photo', 'objet_perdu', 'objet_retrouve'));
create index if not exists idx_stages_posts_stage on public.stages_posts (stage_id, created_at desc);

-- ── Sponsors ─────────────────────────────────────────────────────────
alter table public.stages_sponsors alter column actif set not null;
alter table public.stages_sponsors drop constraint if exists stages_sponsors_montant_valide;
alter table public.stages_sponsors add constraint stages_sponsors_montant_valide check (montant is null or montant >= 0);
create index if not exists idx_stages_sponsors_stage on public.stages_sponsors (stage_id);

-- ── Encadrants du stage (comptes du club ou personnes extérieures) ──
create table if not exists public.stages_encadrants (
  id         uuid primary key default gen_random_uuid(),
  stage_id   uuid not null references public.stages(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete set null,
  nom        text not null,
  role       text,          -- responsabilité : « Responsable U8 », « Infirmerie », « Transport »…
  telephone  text,
  created_at timestamptz not null default now()
);
create index if not exists idx_stages_encadrants_stage on public.stages_encadrants (stage_id);

-- ── Tâches (table de la 1re version, vide) : rattachées à un encadrant
alter table public.stages_taches
  add column if not exists encadrant_id uuid references public.stages_encadrants(id) on delete set null;
alter table public.stages_taches alter column statut set default 'a_faire';
alter table public.stages_taches alter column statut set not null;
alter table public.stages_taches drop constraint if exists stages_taches_statut_valide;
alter table public.stages_taches add constraint stages_taches_statut_valide
  check (statut in ('a_faire', 'en_cours', 'fait'));
create index if not exists idx_stages_taches_stage on public.stages_taches (stage_id, date);

-- ── Matériel nécessaire ──────────────────────────────────────────────
create table if not exists public.stages_materiel (
  id           uuid primary key default gen_random_uuid(),
  stage_id     uuid not null references public.stages(id) on delete cascade,
  nom          text not null,
  quantite     int not null default 1 check (quantite > 0),
  statut       text not null default 'a_trouver' check (statut in ('a_trouver', 'demande', 'obtenu')),
  encadrant_id uuid references public.stages_encadrants(id) on delete set null,
  source       text,        -- où le trouver : club, prêt, achat, fournisseur…
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_stages_materiel_stage on public.stages_materiel (stage_id);

-- ── Règles d'accès : équipe du stage uniquement ─────────────────────
alter table public.stages_posts      enable row level security;
alter table public.stages_sponsors   enable row level security;
alter table public.stages_encadrants enable row level security;
alter table public.stages_taches     enable row level security;
alter table public.stages_materiel   enable row level security;

-- Toute l'équipe peut lire, masquer, modifier ou supprimer une publication ;
-- une publication ne peut être créée qu'au nom de son auteur.
drop policy if exists "stages_posts_gestion" on public.stages_posts;
create policy "stages_posts_gestion" on public.stages_posts
  for all to authenticated
  using (exists (select 1 from public.stages s where s.id = stage_id and public.peut_gerer_stages(s.club_id)))
  with check (exists (select 1 from public.stages s where s.id = stage_id and public.peut_gerer_stages(s.club_id)));
drop policy if exists "stages_posts_auteur" on public.stages_posts;
create policy "stages_posts_auteur" on public.stages_posts
  as restrictive for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists "stages_sponsors_gestion" on public.stages_sponsors;
create policy "stages_sponsors_gestion" on public.stages_sponsors
  for all to authenticated
  using (exists (select 1 from public.stages s where s.id = stage_id and public.peut_gerer_stages(s.club_id)))
  with check (exists (select 1 from public.stages s where s.id = stage_id and public.peut_gerer_stages(s.club_id)));

drop policy if exists "stages_encadrants_gestion" on public.stages_encadrants;
create policy "stages_encadrants_gestion" on public.stages_encadrants
  for all to authenticated
  using (exists (select 1 from public.stages s where s.id = stage_id and public.peut_gerer_stages(s.club_id)))
  with check (exists (select 1 from public.stages s where s.id = stage_id and public.peut_gerer_stages(s.club_id)));

drop policy if exists "stages_taches_gestion" on public.stages_taches;
create policy "stages_taches_gestion" on public.stages_taches
  for all to authenticated
  using (exists (select 1 from public.stages s where s.id = stage_id and public.peut_gerer_stages(s.club_id)))
  with check (exists (select 1 from public.stages s where s.id = stage_id and public.peut_gerer_stages(s.club_id)));

drop policy if exists "stages_materiel_gestion" on public.stages_materiel;
create policy "stages_materiel_gestion" on public.stages_materiel
  for all to authenticated
  using (exists (select 1 from public.stages s where s.id = stage_id and public.peut_gerer_stages(s.club_id)))
  with check (exists (select 1 from public.stages s where s.id = stage_id and public.peut_gerer_stages(s.club_id)));

revoke all on public.stages_posts, public.stages_sponsors, public.stages_encadrants,
              public.stages_taches, public.stages_materiel from anon;
revoke truncate, references, trigger on public.stages_posts, public.stages_sponsors, public.stages_encadrants,
              public.stages_taches, public.stages_materiel from authenticated;

-- ── Page publique : + publications visibles et sponsors actifs ──────
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
      select jsonb_agg(jsonb_build_object('nom', sp.nom, 'logo_url', sp.logo_url, 'lien_url', sp.lien_url, 'message', sp.message)
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
