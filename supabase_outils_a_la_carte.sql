-- Chantier outils à la carte, bloc 2 (PLAN-outils-a-la-carte.md) : base de
-- données des outils. Additif uniquement : aucune table ni règle existante
-- n'est modifiée, sauf l'ajout d'une colonne à profiles (faux par défaut, donc
-- sans effet sur aucun compte tant qu'on ne l'active pas).
--
-- Contenu :
--   1. profiles.modele_outils : drapeau « ce compte suit le nouveau modèle ».
--      Non modifiable par l'utilisateur (profiles n'accorde la modification que
--      colonne par colonne, cf. supabase_fix_profiles_sensitive_grants.sql ;
--      une nouvelle colonne n'est donc pas modifiable tant qu'on ne l'ajoute pas
--      à cette liste, ce qu'on ne fera jamais).
--   2. outils_comptes : qui a quel outil, d'où il vient (achat, essai, offre)
--      et jusqu'à quand. Écrite seulement par les fonctions serveur (clé
--      service), jamais depuis le navigateur.
--   3. outils_essais_utilises : un essai gratuit par outil et par compte
--      (essais lancés par le client ; une offre de l'administrateur n'y est pas
--      inscrite, elle ignore cette règle).
--   4. outils_club_ouverts : outils du club ouverts à ses éducateurs affiliés.
--   5. outils_affichage_educateur : l'éducateur masque des outils de son menu.
--   6. a_outil(compte, outil) et outils_actifs(compte).
--
-- Règles retenues :
--   - fin_le vide = abonnement en cours ; fin_le rempli = l'outil s'éteint seul
--     à cette date (essai, offre, outil retiré encore payé). Aucune tâche
--     planifiée n'est nécessaire.
--   - Un outil du club arrive chez l'éducateur seulement si : l'éducateur est
--     affilié accepté (club_educateurs), le club a l'outil actif, le club l'a
--     ouvert, et l'abonnement du club est actif. Les identifiants sont les mêmes
--     des deux côtés (projet_sportif, cff4, stages), cf. viaClub dans
--     src/lib/catalogueOutils.js.
--   - Pas de ligne « source club » stockée : l'outil reçu du club est calculé
--     au moment de la lecture. Quand le club retire ou perd un outil, ses
--     éducateurs le perdent à la même date, sans rien recopier.
--   - a_outil ne regarde que les données. Le verrou (bloc 15) appliquera la
--     règle aux seuls comptes où modele_outils est vrai.
--
-- Exécution : lancer d'abord ~/Sauvegardes-DigitalFootball/sauvegarder.sh, puis
-- ce fichier en entier, puis supabase_outils_a_la_carte_verification.sql.

begin;

-- ── 1. Drapeau par compte ───────────────────────────────────────────────────

alter table public.profiles
  add column if not exists modele_outils boolean not null default false;

-- ── 2. Outils par compte ────────────────────────────────────────────────────

create table if not exists public.outils_comptes (
  compte_id uuid not null references public.profiles(id) on delete cascade,
  outil text not null check (outil ~ '^[a-z0-9_]{2,40}$'),
  source text not null check (source in ('achat', 'essai', 'offre')),
  fin_le timestamptz,
  periodicite text check (periodicite in ('mensuel', 'annuel')),
  stripe_subscription_id text,
  stripe_item_id text,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  primary key (compte_id, outil),
  -- un essai ou une offre a toujours une date de fin
  constraint outils_comptes_fin_essai check (source = 'achat' or fin_le is not null)
);

create index if not exists outils_comptes_stripe_sub_idx
  on public.outils_comptes (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- ── 3. Essais déjà utilisés ─────────────────────────────────────────────────

create table if not exists public.outils_essais_utilises (
  compte_id uuid not null references public.profiles(id) on delete cascade,
  outil text not null check (outil ~ '^[a-z0-9_]{2,40}$'),
  utilise_le timestamptz not null default now(),
  primary key (compte_id, outil)
);

-- ── 4. Outils ouverts par le club à ses éducateurs ──────────────────────────

create table if not exists public.outils_club_ouverts (
  club_id uuid not null references public.profiles(id) on delete cascade,
  outil text not null check (outil ~ '^[a-z0-9_]{2,40}$'),
  ouvert_le timestamptz not null default now(),
  primary key (club_id, outil)
);

-- ── 5. Affichage choisi par l'éducateur ─────────────────────────────────────

create table if not exists public.outils_affichage_educateur (
  educateur_id uuid not null references public.profiles(id) on delete cascade,
  outil text not null check (outil ~ '^[a-z0-9_]{2,40}$'),
  visible boolean not null default true,
  maj_le timestamptz not null default now(),
  primary key (educateur_id, outil)
);

-- ── 6. Fonctions ────────────────────────────────────────────────────────────

-- Vrai si l'utilisateur connecté est le compte club lui-même ou un membre de
-- son staff. SECURITY DEFINER pour lire staff_club sans dépendre de ses règles
-- (même méthode que club_gere_educateur).
create or replace function public.outils_gere_club(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    auth.uid() = p_club_id
    or exists (select 1 from public.staff_club sc where sc.club_id = p_club_id and sc.user_id = auth.uid())
  )
$$;

-- Vrai si l'utilisateur connecté est un éducateur affilié accepté du club.
create or replace function public.outils_educateur_du_club(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.club_educateurs ce
    where ce.club_id = p_club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte'
  )
$$;

-- Outils actifs d'un compte : les siens (achat, essai, offre non expirés) et
-- ceux reçus de son club (source 'club'). Un outil à la fois payé par
-- l'éducateur et reçu du club apparaît deux fois : c'est voulu, l'appli peut
-- prévenir l'éducateur qu'il peut retirer le sien.
-- Réponse vide si l'utilisateur connecté n'est ni ce compte ni son staff.
-- Les fonctions serveur (clé service, sans utilisateur) lisent tout.
create or replace function public.outils_actifs(p_compte uuid)
returns table (outil text, source text, fin_le timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select oc.outil, oc.source, oc.fin_le
  from public.outils_comptes oc
  where oc.compte_id = p_compte
    and (oc.fin_le is null or oc.fin_le > now())
    and (auth.uid() is null or auth.uid() = p_compte or public.outils_gere_club(p_compte))
  union all
  select o.outil, 'club',
    case when bool_or(club_oc.fin_le is null) then null else max(club_oc.fin_le) end
  from public.club_educateurs ce
  join public.profiles club on club.id = ce.club_id and club.abonnement_actif is true
  join public.outils_club_ouverts o on o.club_id = ce.club_id
  join public.outils_comptes club_oc on club_oc.compte_id = ce.club_id and club_oc.outil = o.outil
    and (club_oc.fin_le is null or club_oc.fin_le > now())
  where ce.educateur_id = p_compte and ce.statut = 'accepte'
    and (auth.uid() is null or auth.uid() = p_compte)
  group by o.outil
$$;

-- Le compte a-t-il cet outil en ce moment ? Servira au verrou du bloc 15 et
-- aux fonctions serveur. Ne dépend pas de l'utilisateur connecté : le verrou
-- doit pouvoir demander « le club de cette ligne a-t-il l'outil ».
create or replace function public.a_outil(p_compte uuid, p_outil text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.outils_comptes oc
    where oc.compte_id = p_compte and oc.outil = p_outil
      and (oc.fin_le is null or oc.fin_le > now())
  ) or exists (
    select 1
    from public.club_educateurs ce
    join public.profiles club on club.id = ce.club_id and club.abonnement_actif is true
    join public.outils_club_ouverts o on o.club_id = ce.club_id and o.outil = p_outil
    join public.outils_comptes club_oc on club_oc.compte_id = ce.club_id and club_oc.outil = p_outil
      and (club_oc.fin_le is null or club_oc.fin_le > now())
    where ce.educateur_id = p_compte and ce.statut = 'accepte'
  )
$$;

revoke all on function public.outils_gere_club(uuid) from public, anon;
revoke all on function public.outils_educateur_du_club(uuid) from public, anon;
revoke all on function public.outils_actifs(uuid) from public, anon;
revoke all on function public.a_outil(uuid, text) from public, anon;
grant execute on function public.outils_gere_club(uuid) to authenticated, service_role;
grant execute on function public.outils_educateur_du_club(uuid) to authenticated, service_role;
grant execute on function public.outils_actifs(uuid) to authenticated, service_role;
grant execute on function public.a_outil(uuid, text) to authenticated, service_role;

-- ── 7. Règles d'accès ───────────────────────────────────────────────────────

alter table public.outils_comptes enable row level security;
alter table public.outils_essais_utilises enable row level security;
alter table public.outils_club_ouverts enable row level security;
alter table public.outils_affichage_educateur enable row level security;

-- Le navigateur ne peut que lire achats, essais et essais utilisés : les
-- écritures passent par les fonctions serveur (clé service, qui ignore RLS).
revoke all on public.outils_comptes from anon, authenticated;
revoke all on public.outils_essais_utilises from anon, authenticated;
revoke all on public.outils_club_ouverts from anon, authenticated;
revoke all on public.outils_affichage_educateur from anon, authenticated;
grant select on public.outils_comptes to authenticated;
grant select on public.outils_essais_utilises to authenticated;
grant select, insert, delete on public.outils_club_ouverts to authenticated;
grant select, insert, update, delete on public.outils_affichage_educateur to authenticated;
grant all on public.outils_comptes, public.outils_essais_utilises,
  public.outils_club_ouverts, public.outils_affichage_educateur to service_role;

-- Achats et essais : le compte lit les siens, le staff du club lit ceux du club.
drop policy if exists "outils_comptes_lecture" on public.outils_comptes;
create policy "outils_comptes_lecture" on public.outils_comptes
  for select to authenticated
  using (compte_id = auth.uid() or public.outils_gere_club(compte_id));

drop policy if exists "outils_essais_lecture" on public.outils_essais_utilises;
create policy "outils_essais_lecture" on public.outils_essais_utilises
  for select to authenticated
  using (compte_id = auth.uid() or public.outils_gere_club(compte_id));

-- Outils ouverts : le club et son staff les lisent, ses éducateurs affiliés
-- aussi ; seul le compte club les ouvre ou les ferme (la délégation au staff
-- pourra venir au bloc 10 si besoin).
drop policy if exists "outils_club_ouverts_lecture" on public.outils_club_ouverts;
create policy "outils_club_ouverts_lecture" on public.outils_club_ouverts
  for select to authenticated
  using (public.outils_gere_club(club_id) or public.outils_educateur_du_club(club_id));

drop policy if exists "outils_club_ouverts_ouvrir" on public.outils_club_ouverts;
create policy "outils_club_ouverts_ouvrir" on public.outils_club_ouverts
  for insert to authenticated
  with check (club_id = auth.uid());

drop policy if exists "outils_club_ouverts_fermer" on public.outils_club_ouverts;
create policy "outils_club_ouverts_fermer" on public.outils_club_ouverts
  for delete to authenticated
  using (club_id = auth.uid());

-- Affichage : l'éducateur gère uniquement ses propres choix.
drop policy if exists "outils_affichage_proprietaire" on public.outils_affichage_educateur;
create policy "outils_affichage_proprietaire" on public.outils_affichage_educateur
  for all to authenticated
  using (educateur_id = auth.uid())
  with check (educateur_id = auth.uid());

commit;
