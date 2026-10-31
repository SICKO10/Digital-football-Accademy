-- Chantier saisons, bloc 5 (PLAN-saisons.md) : circuit de demandes coach → club
-- et droits de validation par rôle. Additif uniquement : aucune règle existante
-- n'est modifiée (club_categories, club_educateurs, staff_club restent tels
-- quels). Le verrouillage de l'auto-déclaration viendra au bloc 8.
--
-- Contenu :
--   1. saison_tranche_age / saison_role_couvre_categorie : règle pure « quel rôle
--      valide quelle catégorie » (testable sans données).
--   2. saison_est_membre_club / saison_peut_valider : la même règle appliquée à
--      l'utilisateur connecté.
--   3. Table saison_demandes (affiliation ou catégorie) + règles d'accès.
--   4. saison_traiter_demande (valider/refuser) et saison_annuler_demande.
--   5. Table saisons_closes_club (bouton club « Clôturer une saison », bloc 10).
--
-- Qui valide :
--   - compte principal du club (club_id = auth.uid()), président, directeur
--     sportif : tout ;
--   - affiliation (reste / quitte) et clôture club : les mêmes, plus le
--     responsable formation ;
--   - responsable formation : U15 à Seniors ; responsable préformation : U11 à
--     U14 ; responsable école de foot : U10 et moins ;
--   - tous les autres rôles (secrétaire comprise) : rien.
--   Règle fixe, volontairement indépendante de role_categories_access (qui règle
--   ce qu'un rôle VOIT, configurable par le club). Personne ne valide sa propre
--   demande.

-- ── 1. Règle pure ────────────────────────────────────────────────────────────

-- 'U17', 'u17', 'U17F', 'U17 Féminin' → 17 ; 'Seniors', 'SeniorsF' → 99 ;
-- texte non reconnu (ex. 'Vétérans') → null, réservé aux rôles « tout ».
create or replace function public.saison_tranche_age(p_categorie text)
returns int
language sql
immutable
set search_path = public
as $$
  select case
    when p_categorie is null then null
    when upper(p_categorie) like '%SENIOR%' or upper(p_categorie) like '%SÉNIOR%' then 99
    when upper(p_categorie) ~ '^\s*U\s*\d{1,2}' then substring(upper(p_categorie) from '^\s*U\s*(\d{1,2})')::int
    else null
  end
$$;

-- p_categorie null = demande d'affiliation ou clôture club (pas de catégorie) :
-- président, directeur sportif et responsable formation (décision Kevin
-- 2026-10-31).
create or replace function public.saison_role_couvre_categorie(p_role text, p_categorie text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  a int := public.saison_tranche_age(p_categorie);
begin
  if p_role in ('president', 'directeur_sportif') then return true; end if;
  if p_categorie is null then return p_role = 'responsable_formation'; end if;
  if a is null then return false; end if;
  return case p_role
    when 'responsable_formation' then a >= 15
    when 'responsable_preformation' then a between 11 and 14
    when 'responsable_ecole_foot' then a <= 10
    else false
  end;
end
$$;

-- ── 2. Appliquée à l'utilisateur connecté ────────────────────────────────────

-- Compte principal du club ou n'importe quel membre de son staff.
create or replace function public.saison_est_membre_club(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    auth.uid() = p_club_id
    or exists (select 1 from staff_club sc where sc.club_id = p_club_id and sc.user_id = auth.uid())
  )
$$;

create or replace function public.saison_peut_valider(p_club_id uuid, p_categorie text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    auth.uid() = p_club_id
    or exists (
      select 1 from staff_club sc
      where sc.club_id = p_club_id and sc.user_id = auth.uid()
        and public.saison_role_couvre_categorie(sc.role, p_categorie)
    )
  )
$$;

-- ── 3. Table des demandes ────────────────────────────────────────────────────

create table if not exists saison_demandes (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references profiles(id) on delete cascade,
  educateur_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('affiliation', 'categorie')),
  saison text not null check (saison ~ '^\d{4}-\d{4}$'),
  -- affiliation : true = reste au club, false = quitte le club
  souhaite_rester boolean,
  -- catégorie : nom et équipe comme dans club_categories (ex. 'U17' + 'A'),
  -- club_categorie_id rempli si le coach vise une équipe déjà créée par le club
  categorie_nom text,
  categorie_equipe text,
  club_categorie_id uuid references club_categories(id) on delete set null,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'validee', 'refusee', 'annulee')),
  commentaire text,
  traitee_par uuid references profiles(id) on delete set null,
  traitee_le timestamptz,
  created_at timestamptz not null default now(),
  constraint saison_demandes_contenu check (
    (type = 'affiliation' and souhaite_rester is not null and categorie_nom is null and club_categorie_id is null)
    or (type = 'categorie' and souhaite_rester is null
        and nullif(trim(categorie_nom), '') is not null
        and nullif(trim(categorie_equipe), '') is not null)
  )
);

-- Une seule demande en attente par coach, club, saison et sujet.
create unique index if not exists saison_demandes_une_en_attente
  on saison_demandes (educateur_id, club_id, saison, type,
    coalesce(upper(trim(categorie_nom)), ''), coalesce(upper(trim(categorie_equipe)), ''))
  where statut = 'en_attente';

create index if not exists saison_demandes_club_statut on saison_demandes (club_id, statut);

alter table saison_demandes enable row level security;

-- Lecture : le coach voit les siennes, le club et tout son staff voient celles
-- du club (un rôle non autorisé voit la demande, sans pouvoir la traiter).
drop policy if exists "saison_demandes_lecture" on saison_demandes;
create policy "saison_demandes_lecture" on saison_demandes
  for select
  using (educateur_id = auth.uid() or public.saison_est_membre_club(club_id));

-- Création : le coach, pour lui-même, auprès d'un club qui l'a accepté, et
-- toujours « en attente ». Aucune policy update/delete : tout changement passe
-- par saison_traiter_demande ou saison_annuler_demande.
drop policy if exists "saison_demandes_creation_coach" on saison_demandes;
create policy "saison_demandes_creation_coach" on saison_demandes
  for insert
  with check (
    educateur_id = auth.uid()
    and statut = 'en_attente'
    and traitee_par is null
    and traitee_le is null
    and exists (
      select 1 from club_educateurs ce
      where ce.club_id = saison_demandes.club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte'
    )
    and (
      club_categorie_id is null
      or exists (select 1 from club_categories cc where cc.id = saison_demandes.club_categorie_id and cc.club_id = saison_demandes.club_id)
    )
  );

grant select, insert on saison_demandes to authenticated;

-- ── 4. Traitement ────────────────────────────────────────────────────────────

-- Valide ou refuse une demande. À la validation :
--   - catégorie : rattache le coach à l'équipe (réclame la ligne vacante, ou la
--     crée si elle n'existe pas). Ne retire jamais une équipe à un autre coach ;
--   - affiliation « reste » : le coach doit toujours être accepté au club ;
--   - affiliation « quitte » : libère ses équipes et le retire du club, comme le
--     bouton « Retirer » de la page Éducateurs. Un départ ne se refuse pas.
create or replace function public.saison_traiter_demande(
  p_demande_id uuid,
  p_decision text,
  p_commentaire text default null
)
returns saison_demandes
language plpgsql
security definer
set search_path = public
as $$
declare
  d saison_demandes;
  cat club_categories;
  v_cat_id uuid;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  if p_decision is null or p_decision not in ('validee', 'refusee') then
    raise exception 'Décision inconnue : %', p_decision;
  end if;

  select * into d from saison_demandes where id = p_demande_id for update;
  if not found then raise exception 'Demande introuvable'; end if;
  if d.statut <> 'en_attente' then raise exception 'Cette demande a déjà été traitée'; end if;
  if d.educateur_id = auth.uid() then raise exception 'Impossible de traiter sa propre demande'; end if;
  if not public.saison_peut_valider(d.club_id, case when d.type = 'categorie' then d.categorie_nom end) then
    raise exception 'Votre rôle ne permet pas de traiter cette demande';
  end if;

  if d.type = 'affiliation' and not d.souhaite_rester and p_decision = 'refusee' then
    raise exception 'Un départ ne se refuse pas';
  end if;

  if p_decision = 'validee' then
    if d.type = 'affiliation' and not d.souhaite_rester then
      update club_categories set educateur_id = null
        where club_id = d.club_id and educateur_id = d.educateur_id;
      delete from club_educateurs where club_id = d.club_id and educateur_id = d.educateur_id;
    else
      if not exists (
        select 1 from club_educateurs
        where club_id = d.club_id and educateur_id = d.educateur_id and statut = 'accepte'
      ) then
        raise exception 'Ce coach n''est plus affilié au club';
      end if;

      if d.type = 'categorie' then
        if d.club_categorie_id is not null then
          select * into cat from club_categories
            where id = d.club_categorie_id and club_id = d.club_id
            for update;
        else
          -- Même nom et même équipe : d'abord une ligne déjà à lui, puis une vacante.
          select * into cat from club_categories
            where club_id = d.club_id
              and upper(trim(nom)) = upper(trim(d.categorie_nom))
              and upper(trim(coalesce(equipe, ''))) = upper(trim(d.categorie_equipe))
            order by (educateur_id is not distinct from d.educateur_id) desc, (educateur_id is null) desc
            limit 1
            for update;
        end if;

        if cat.id is null then
          insert into club_categories (club_id, nom, equipe, educateur_id)
            values (d.club_id, trim(d.categorie_nom), trim(d.categorie_equipe), d.educateur_id)
            returning id into v_cat_id;
        elsif cat.educateur_id is not null and cat.educateur_id <> d.educateur_id then
          raise exception 'L''équipe % % a déjà un coach : il faut d''abord la libérer', cat.nom, cat.equipe;
        else
          update club_categories set educateur_id = d.educateur_id where id = cat.id;
          v_cat_id := cat.id;
        end if;
      end if;
    end if;
  end if;

  update saison_demandes set
    statut = p_decision,
    commentaire = nullif(trim(p_commentaire), ''),
    traitee_par = auth.uid(),
    traitee_le = now(),
    club_categorie_id = coalesce(v_cat_id, club_categorie_id)
  where id = d.id
  returning * into d;

  return d;
end
$$;

-- Le coach retire sa propre demande tant qu'elle est en attente.
create or replace function public.saison_annuler_demande(p_demande_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update saison_demandes set statut = 'annulee', traitee_par = auth.uid(), traitee_le = now()
    where id = p_demande_id and educateur_id = auth.uid() and statut = 'en_attente';
  if not found then raise exception 'Demande introuvable ou déjà traitée'; end if;
end
$$;

-- ── 5. Saison close pour un club ─────────────────────────────────────────────

-- Le bouton club « Clôturer une saison » (bloc 10) n'archive rien : il marque
-- la saison close pour ce club. Même droit que les demandes d'affiliation.
create table if not exists saisons_closes_club (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references profiles(id) on delete cascade,
  saison text not null check (saison ~ '^\d{4}-\d{4}$'),
  close_le timestamptz not null default now(),
  close_par uuid references profiles(id) on delete set null,
  unique (club_id, saison)
);

alter table saisons_closes_club enable row level security;

-- Lecture : club, staff, et coachs acceptés du club.
drop policy if exists "saisons_closes_club_lecture" on saisons_closes_club;
create policy "saisons_closes_club_lecture" on saisons_closes_club
  for select
  using (
    public.saison_est_membre_club(club_id)
    or exists (
      select 1 from club_educateurs ce
      where ce.club_id = saisons_closes_club.club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte'
    )
  );

drop policy if exists "saisons_closes_club_cloture" on saisons_closes_club;
create policy "saisons_closes_club_cloture" on saisons_closes_club
  for insert
  with check (close_par = auth.uid() and public.saison_peut_valider(club_id, null));

-- Rouvrir une saison close par erreur.
drop policy if exists "saisons_closes_club_reouverture" on saisons_closes_club;
create policy "saisons_closes_club_reouverture" on saisons_closes_club
  for delete
  using (public.saison_peut_valider(club_id, null));

grant select, insert, delete on saisons_closes_club to authenticated;

-- ── Droits d'exécution ───────────────────────────────────────────────────────

revoke all on saison_demandes from anon;
revoke all on saisons_closes_club from anon;

revoke all on function public.saison_est_membre_club(uuid) from public, anon;
revoke all on function public.saison_peut_valider(uuid, text) from public, anon;
revoke all on function public.saison_traiter_demande(uuid, text, text) from public, anon;
revoke all on function public.saison_annuler_demande(uuid) from public, anon;
grant execute on function public.saison_est_membre_club(uuid) to authenticated;
grant execute on function public.saison_peut_valider(uuid, text) to authenticated;
grant execute on function public.saison_traiter_demande(uuid, text, text) to authenticated;
grant execute on function public.saison_annuler_demande(uuid) to authenticated;
