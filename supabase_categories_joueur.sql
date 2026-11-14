-- Bloc 6 (chantier catégories, PLAN-categories.md) : côté joueur.
--
-- Ce que fait ce fichier (1 table, 3 fonctions, aucune règle existante modifiée) :
--   1. Table disponibilites_categorie : la réponse d'un joueur à une DATE
--      (« Je suis là samedi 21 » / « Absent »), pour une catégorie en effectif
--      commun. Unique (joueur, catégorie, date). La table `disponibilites`
--      (réponse par entraînement ou par match) ne bouge pas.
--        - le joueur lit, écrit et supprime ses propres réponses, seulement
--          pour une catégorie en commun dont il a une fiche ;
--        - ceux qui voient la catégorie commune (club, éducateurs, staff
--          concerné) lisent les réponses : la grille de convocation s'en sert.
--   2. categories_joueur_agenda(jours) : entraînements et matchs à venir de
--      TOUTES les équipes des catégories communes du joueur connecté (colonnes
--      limitées : équipe, date, heure, lieu, adversaire). Ne renvoie que ce
--      qui concerne le joueur connecté.
--   3. categories_joueur_convocations(matchs) : pour les matchs où le joueur
--      connecté est convoqué, le match et le nom de l'équipe (« U15 B »). Sert
--      dans les DEUX modes : le joueur lit ainsi le match d'un autre éducateur
--      de la catégorie sans qu'on ouvre une règle de lecture sur matchs_equipe.
--
-- Mode « par équipe » : l'agenda est vide, la table n'accepte aucune réponse,
-- rien ne change. Un autre club ne voit jamais rien.
--
-- Avant de lancer : ~/Sauvegardes-DigitalFootball/sauvegarder.sh
-- À lancer en entier, d'un seul coup, dans Supabase (SQL Editor). Tout ou
-- rien. Relançable sans erreur. Les blocs 3 et 4 doivent être appliqués.
-- Ensuite : supabase_categories_joueur_verification.sql.

begin;

-- ── 0. Les blocs précédents doivent être appliqués ─────────────────────────
do $$
begin
  if to_regprocedure('public.categories_commun_visible(uuid)') is null then
    raise exception 'Arrêt sans rien changer : appliquer d''abord supabase_categories_commun.sql (bloc 3).';
  end if;
end $$;

-- ── 1. Le joueur connecté a-t-il une fiche dans cette catégorie commune ? ──
create or replace function public.categories_joueur_dans_commun(p_categorie_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_categorie_id is not null
    and exists (select 1 from public.categories c where c.id = p_categorie_id and c.mode = 'commun')
    and exists (
      select 1 from public.equipe_joueurs ej
      where ej.categorie_id = p_categorie_id and ej.joueur_id = auth.uid()
    )
$$;

-- ── 2. Réponses à la date ──────────────────────────────────────────────────
create table if not exists public.disponibilites_categorie (
  id           uuid primary key default gen_random_uuid(),
  joueur_id    uuid not null references public.profiles(id) on delete cascade,
  categorie_id uuid not null references public.categories(id) on delete cascade,
  date         date not null,
  statut       text not null check (statut in ('present', 'absent')),
  commentaire  text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (joueur_id, categorie_id, date)
);

create index if not exists disponibilites_categorie_categorie_date_idx
  on public.disponibilites_categorie (categorie_id, date);

alter table public.disponibilites_categorie enable row level security;

drop policy if exists "dispo_categorie_joueur_lecture" on public.disponibilites_categorie;
create policy "dispo_categorie_joueur_lecture" on public.disponibilites_categorie
  for select to authenticated
  using (joueur_id = auth.uid());

drop policy if exists "dispo_categorie_joueur_ecriture" on public.disponibilites_categorie;
create policy "dispo_categorie_joueur_ecriture" on public.disponibilites_categorie
  for insert to authenticated
  with check (joueur_id = auth.uid() and public.categories_joueur_dans_commun(categorie_id));

drop policy if exists "dispo_categorie_joueur_modification" on public.disponibilites_categorie;
create policy "dispo_categorie_joueur_modification" on public.disponibilites_categorie
  for update to authenticated
  using (joueur_id = auth.uid())
  with check (joueur_id = auth.uid() and public.categories_joueur_dans_commun(categorie_id));

drop policy if exists "dispo_categorie_joueur_suppression" on public.disponibilites_categorie;
create policy "dispo_categorie_joueur_suppression" on public.disponibilites_categorie
  for delete to authenticated
  using (joueur_id = auth.uid());

drop policy if exists "dispo_categorie_encadrement_lecture" on public.disponibilites_categorie;
create policy "dispo_categorie_encadrement_lecture" on public.disponibilites_categorie
  for select to authenticated
  using (public.categories_commun_visible(categorie_id));

-- ── 3. Agenda du joueur : toutes les équipes de ses catégories communes ────
create or replace function public.categories_joueur_agenda(p_jours int default 30)
returns table (
  type text,
  id uuid,
  categorie_id uuid,
  categorie_nom text,
  club_categorie_id uuid,
  equipe_nom text,
  equipe_lettre text,
  date date,
  heure text,
  lieu text,
  titre text
)
language sql
stable
security definer
set search_path = ''
as $$
  with mes_categories as (
    select distinct ej.categorie_id
    from public.equipe_joueurs ej
    join public.categories c on c.id = ej.categorie_id and c.mode = 'commun'
    where ej.joueur_id = auth.uid()
  )
  select 'entrainement'::text, e.id, cc.categorie_id, ca.nom, cc.id, cc.nom, cc.equipe,
         e.date::date, e.heure, e.lieu, e.description
  from public.entrainements e
  join public.club_categories cc on cc.id = e.club_categorie_id
  join public.categories ca on ca.id = cc.categorie_id
  where cc.categorie_id in (select categorie_id from mes_categories)
    and e.date::date between current_date and current_date + greatest(least(coalesce(p_jours, 30), 90), 1)
  union all
  select 'match'::text, m.id, cc.categorie_id, ca.nom, cc.id, cc.nom, cc.equipe,
         m.date::date, m.heure, m.lieu, m.adversaire
  from public.matchs_equipe m
  join public.club_categories cc on cc.id = m.club_categorie_id
  join public.categories ca on ca.id = cc.categorie_id
  where cc.categorie_id in (select categorie_id from mes_categories)
    and m.date::date between current_date and current_date + greatest(least(coalesce(p_jours, 30), 90), 1)
  order by 8, 9, 2
$$;

-- ── 4. Matchs où le joueur est convoqué, avec le nom de l'équipe ───────────
create or replace function public.categories_joueur_convocations(p_match_ids uuid[])
returns table (
  match_id uuid,
  adversaire text,
  date date,
  heure text,
  lieu text,
  domicile boolean,
  competition text,
  equipe_nom text,
  equipe_lettre text
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.adversaire, m.date::date, m.heure, m.lieu, m.domicile, m.competition,
         cc.nom, cc.equipe
  from public.matchs_equipe m
  left join public.club_categories cc on cc.id = m.club_categorie_id
  where m.id = any (p_match_ids)
    and exists (
      select 1
      from public.convocations cv
      join public.convocation_joueurs cj on cj.convocation_id = cv.id
      where cv.match_id = m.id and cv.publiee = true
        and (cv.expire_at is null or cv.expire_at > now())
        and cj.joueur_id = auth.uid()
    )
$$;

revoke all on function public.categories_joueur_dans_commun(uuid) from public, anon;
revoke all on function public.categories_joueur_agenda(int) from public, anon;
revoke all on function public.categories_joueur_convocations(uuid[]) from public, anon;
grant execute on function public.categories_joueur_dans_commun(uuid) to authenticated, service_role;
grant execute on function public.categories_joueur_agenda(int) to authenticated, service_role;
grant execute on function public.categories_joueur_convocations(uuid[]) to authenticated, service_role;

commit;

-- Résumé affiché à la fin (lecture seule).
select
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('categories_joueur_dans_commun', 'categories_joueur_agenda', 'categories_joueur_convocations')) as fonctions,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'disponibilites_categorie') as regles_table;
