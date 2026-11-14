-- Bloc 1 (chantier catégories, PLAN-categories.md) : fondation en base.
--
-- Ce que fait ce fichier :
--   1. une nouvelle table « categories » (U15, U17…) au-dessus des équipes
--      existantes (club_categories), toutes en mode « par équipe » ;
--   2. une colonne categorie_id sur les équipes (club_categories) et sur les
--      fiches joueurs (equipe_joueurs) ;
--   3. la reprise : même club + même nom nettoyé (majuscules, espaces retirés)
--      = même catégorie. « U18 » + « A » → catégorie U18, équipe A ;
--   4. trois déclencheurs qui tiennent ces colonnes à jour tout seuls : les
--      formulaires actuels (club, demandes de saison) marchent sans changement.
--
-- Rien n'est supprimé, aucune règle d'accès existante n'est modifiée.
-- L'application se comporte exactement comme avant.
--
-- Avant de lancer : ~/Sauvegardes-DigitalFootball/sauvegarder.sh
-- À lancer en entier, d'un seul coup, dans Supabase (SQL Editor). Tout ou
-- rien : à la moindre erreur, rien n'est changé. Relançable sans erreur.
-- Ensuite : supabase_categories_verification.sql.

begin;

-- ── 0. Sécurité : aucun déclencheur inconnu ne doit tourner pendant la reprise
-- La reprise modifie toutes les équipes et toutes les fiches. Si un déclencheur
-- inconnu réagit à toute modification de ces tables (avis, journal…), on
-- s'arrête avant d'avoir rien changé, pour l'examiner d'abord.
do $$
declare
  v_liste text;
begin
  select string_agg(t.tgrelid::regclass::text || '.' || t.tgname, ', ')
    into v_liste
  from pg_trigger t
  where t.tgrelid in ('public.club_categories'::regclass, 'public.equipe_joueurs'::regclass)
    and not t.tgisinternal
    and (t.tgtype & 16) <> 0                    -- réagit aux modifications
    and cardinality(t.tgattr::int2[]) = 0       -- sur n'importe quelle colonne
    and t.tgname not like 'categories\_%';
  if v_liste is not null then
    raise exception 'Arrêt sans rien changer : déclencheur à examiner avant la reprise : %', v_liste;
  end if;
end $$;

-- ── 1. Table des catégories ─────────────────────────────────────────────────
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.profiles(id) on delete cascade,
  nom text not null,
  -- Nom nettoyé : sert à reconnaître « U15 », « u15 » et « U 15 » comme une
  -- seule catégorie.
  nom_cle text generated always as (upper(regexp_replace(nom, '\s+', '', 'g'))) stored,
  mode text not null default 'par_equipe' check (mode in ('par_equipe', 'commun')),
  created_at timestamptz not null default now(),
  constraint categories_club_nom_unique unique (club_id, nom_cle)
);

alter table public.categories enable row level security;
revoke all on public.categories from anon;

-- Qui voit les catégories d'un club : le club, son staff, ses éducateurs
-- affiliés et les coachs d'une de ses équipes. Jamais un autre club.
create or replace function public.categories_peut_lire(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    auth.uid() = p_club_id
    or exists (select 1 from public.staff_club sc where sc.club_id = p_club_id and sc.user_id = auth.uid())
    or exists (select 1 from public.club_educateurs ce
               where ce.club_id = p_club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte')
    or exists (select 1 from public.club_categories cc where cc.club_id = p_club_id and cc.educateur_id = auth.uid())
  )
$$;

revoke all on function public.categories_peut_lire(uuid) from public, anon;
grant execute on function public.categories_peut_lire(uuid) to authenticated, service_role;

-- Création et suppression : compte principal du club seulement (décision 2).
-- Aucune modification directe : le changement de mode passera par une
-- fonction dédiée (bloc 8).
drop policy if exists "categories_lecture" on public.categories;
create policy "categories_lecture" on public.categories
  for select to authenticated
  using (public.categories_peut_lire(club_id));

drop policy if exists "categories_club_cree" on public.categories;
create policy "categories_club_cree" on public.categories
  for insert to authenticated
  with check (club_id = auth.uid());

drop policy if exists "categories_club_supprime" on public.categories;
create policy "categories_club_supprime" on public.categories
  for delete to authenticated
  using (club_id = auth.uid());

-- ── 2. Colonnes sur les équipes et les fiches joueurs ───────────────────────
-- Pas de suppression en cascade : une catégorie qui a encore des équipes ou
-- des fiches ne peut pas être supprimée.
alter table public.club_categories
  add column if not exists categorie_id uuid references public.categories(id);
alter table public.equipe_joueurs
  add column if not exists categorie_id uuid references public.categories(id);

create index if not exists club_categories_categorie_id_idx on public.club_categories (categorie_id);
create index if not exists equipe_joueurs_categorie_id_idx on public.equipe_joueurs (categorie_id);

-- ── 3. Reprise des équipes existantes ───────────────────────────────────────
insert into public.categories (club_id, nom, mode)
select cc.club_id, min(trim(coalesce(cc.nom, ''))), 'par_equipe'
from public.club_categories cc
where cc.club_id is not null
group by cc.club_id, upper(regexp_replace(trim(coalesce(cc.nom, '')), '\s+', '', 'g'))
on conflict (club_id, nom_cle) do nothing;

update public.club_categories cc
set categorie_id = c.id
from public.categories c
where cc.club_id is not null
  and c.club_id = cc.club_id
  and c.nom_cle = upper(regexp_replace(trim(coalesce(cc.nom, '')), '\s+', '', 'g'))
  and cc.categorie_id is distinct from c.id;

update public.equipe_joueurs ej
set categorie_id = cc.categorie_id
from public.club_categories cc
where cc.id = ej.club_categorie_id
  and ej.categorie_id is distinct from cc.categorie_id;

-- Une équipe de club a toujours une catégorie.
alter table public.club_categories drop constraint if exists categories_equipe_rattachee;
alter table public.club_categories
  add constraint categories_equipe_rattachee check (club_id is null or categorie_id is not null);

-- ── 4. Déclencheurs : les colonnes se remplissent toutes seules ─────────────
-- 4a. Équipe créée, renommée ou changée de club : rattachée à la catégorie du
-- même nom dans son club, créée au besoin (mode « par équipe »). Une valeur
-- écrite à la main est toujours recalculée. Tourne avec les droits du
-- propriétaire pour que le staff et les fonctions existantes puissent créer
-- une équipe dans une catégorie neuve ; la création reste soumise aux règles
-- d'accès de club_categories (refusée = tout est annulé, catégorie comprise).
create or replace function public.categories_rattacher_equipe()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nom text;
  v_id uuid;
begin
  if new.club_id is null then
    new.categorie_id := null;
    return new;
  end if;
  if tg_op = 'UPDATE'
     and new.nom is not distinct from old.nom
     and new.club_id is not distinct from old.club_id
     and new.categorie_id is not distinct from old.categorie_id then
    return new;
  end if;

  v_nom := trim(coalesce(new.nom, ''));
  select c.id into v_id
  from public.categories c
  where c.club_id = new.club_id
    and c.nom_cle = upper(regexp_replace(v_nom, '\s+', '', 'g'));

  if v_id is null then
    insert into public.categories (club_id, nom)
      values (new.club_id, v_nom)
      on conflict (club_id, nom_cle) do nothing
      returning id into v_id;
    if v_id is null then
      -- Créée au même instant par une autre requête.
      select c.id into v_id
      from public.categories c
      where c.club_id = new.club_id
        and c.nom_cle = upper(regexp_replace(v_nom, '\s+', '', 'g'));
    end if;
  end if;

  new.categorie_id := v_id;
  return new;
end
$$;

-- 4b. Fiche joueur : même catégorie que son équipe, aucune sans équipe.
-- (Le mode « commun » du bloc 3 assouplira cette règle.)
create or replace function public.categories_rattacher_fiche()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.club_categorie_id is null then
    new.categorie_id := null;
  else
    select cc.categorie_id into new.categorie_id
    from public.club_categories cc
    where cc.id = new.club_categorie_id;
  end if;
  return new;
end
$$;

-- 4c. Équipe changée de catégorie (renommée) : ses fiches suivent.
create or replace function public.categories_suivre_equipe()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.equipe_joueurs
  set categorie_id = new.categorie_id
  where club_categorie_id = new.id
    and categorie_id is distinct from new.categorie_id;
  return null;
end
$$;

revoke all on function public.categories_rattacher_equipe() from public, anon, authenticated;
revoke all on function public.categories_rattacher_fiche() from public, anon, authenticated;
revoke all on function public.categories_suivre_equipe() from public, anon, authenticated;

-- Passe avant saison_garde_attribution_equipe (ordre alphabétique) : si ce
-- dernier refuse, tout est annulé.
drop trigger if exists categories_rattacher_equipe on public.club_categories;
create trigger categories_rattacher_equipe
  before insert or update of nom, club_id, categorie_id on public.club_categories
  for each row execute function public.categories_rattacher_equipe();

drop trigger if exists categories_suivre_equipe on public.club_categories;
create trigger categories_suivre_equipe
  after update of nom, club_id, categorie_id on public.club_categories
  for each row
  when (old.categorie_id is distinct from new.categorie_id)
  execute function public.categories_suivre_equipe();

drop trigger if exists categories_rattacher_fiche on public.equipe_joueurs;
create trigger categories_rattacher_fiche
  before insert or update of club_categorie_id, categorie_id on public.equipe_joueurs
  for each row execute function public.categories_rattacher_fiche();

commit;

-- Résumé affiché à la fin (lecture seule).
select
  (select count(*) from public.club_categories) as equipes,
  (select count(*) from public.categories) as categories,
  (select count(*) from (select 1 from public.club_categories where categorie_id is not null
                         group by categorie_id having count(*) > 1) x) as categories_a_plusieurs_equipes,
  (select count(*) from public.equipe_joueurs where categorie_id is not null) as fiches_rattachees;
