-- Chantier Mon club, bloc 3 (PLAN-mon-club.md) : stockage des réglages
-- d'affichage décidés par le club. Additif uniquement : deux nouvelles tables,
-- aucune table ni règle existante n'est modifiée, aucune ligne n'est créée.
--
-- Contenu :
--   1. mon_club_reglages : le mode « Dashboard de mes éducateurs » du club
--      ('commun' = le même pour tous, 'individualise').
--   2. mon_club_affichage : ce que le club affiche ou masque, outil par outil,
--      pour une cible :
--        'club'       : le menu du dashboard club lui-même ;
--        'educateurs' : le réglage commun à tous ses éducateurs ;
--        'educateur'  : un éducateur précis (educateur_id rempli).
--   3. Fonctions d'accès et règles d'accès (RLS).
--
-- Règles retenues :
--   - Sans ligne, rien ne change : pas de ligne dans mon_club_reglages = mode
--     'commun' ; pas de ligne dans mon_club_affichage = outil affiché. Les
--     clubs de l'ancien modèle ne voient donc aucune différence tant qu'ils ne
--     touchent à rien.
--   - Masquer ne supprime jamais de données : une ligne dit seulement si
--     l'entrée de menu s'affiche (visible vrai ou faux).
--   - Réglages individuels mis de côté sans être effacés : c'est le mode qui
--     décide. En mode 'commun', les lignes 'educateur' restent en base mais
--     l'appli les ignore ; en repassant en 'individualise', elles reviennent.
--     (Pas de drapeau « actif » en plus : une seule source de vérité.)
--   - Priorité, appliquée par l'appli (bloc 5) : ligne 'educateur' (mode
--     individualisé seulement), sinon ligne 'educateurs', sinon affiché. Un
--     outil que l'éducateur paie lui-même reste toujours dans son menu.
--   - Ces tables ne règlent que l'affichage. Elles ne remplacent ni
--     outils_club_ouverts (ce que le club ouvre à ses éducateurs) ni
--     outils_affichage_educateur (ce que l'éducateur masque lui-même) : un
--     éducateur peut toujours masquer en plus ce que le club affiche.
--   - Qui modifie : le compte club, son président (staff_club.role =
--     'president'), et un rôle du staff à qui la matrice « Accès du bureau »
--     donne « Mon club » (role_permissions, section 'mon_club', can_view et
--     can_edit). Sans ligne pour 'mon_club' : personne d'autre que le
--     président (même défaut que PERMISSION_DEFAULTS.mon_club = []).
--   - Qui lit : le club et tout son staff (le menu club doit suivre les
--     réglages pour chacun) ; un éducateur affilié accepté lit le mode, le
--     réglage commun et ses propres lignes, jamais celles des autres.
--
-- Prérequis : supabase_outils_a_la_carte.sql (fonctions outils_gere_club et
-- outils_educateur_du_club, réutilisées ici). Le script s'arrête sans rien
-- modifier s'il manque quelque chose.
--
-- Exécution : lancer d'abord ~/Sauvegardes-DigitalFootball/sauvegarder.sh, puis
-- ce fichier en entier, puis supabase_mon_club_verification.sql.

begin;

-- ── 0. Garde-fous ───────────────────────────────────────────────────────────

do $$
begin
  if current_setting('server_version_num')::int < 150000 then
    raise exception 'ARRÊT : Postgres 15 ou plus requis (unique nulls not distinct). Rien n''a été modifié.';
  end if;
  if to_regprocedure('public.outils_gere_club(uuid)') is null
     or to_regprocedure('public.outils_educateur_du_club(uuid)') is null then
    raise exception 'ARRÊT : fonctions d''outils à la carte absentes (supabase_outils_a_la_carte.sql). Rien n''a été modifié.';
  end if;
  if to_regclass('public.mon_club_reglages') is not null or to_regclass('public.mon_club_affichage') is not null then
    raise exception 'ARRÊT : les tables Mon club existent déjà (script déjà exécuté ?). Rien n''a été modifié.';
  end if;
end;
$$;

-- ── 1. Mode éducateurs du club ──────────────────────────────────────────────

create table public.mon_club_reglages (
  club_id uuid primary key references public.profiles(id) on delete cascade,
  mode_educateurs text not null default 'commun' check (mode_educateurs in ('commun', 'individualise')),
  maj_le timestamptz not null default now(),
  maj_par uuid references public.profiles(id) on delete set null
);

-- ── 2. Affichage décidé par le club ─────────────────────────────────────────

create table public.mon_club_affichage (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.profiles(id) on delete cascade,
  cible text not null check (cible in ('club', 'educateurs', 'educateur')),
  educateur_id uuid references public.profiles(id) on delete cascade,
  outil text not null check (outil ~ '^[a-z0-9_]{2,40}$'),
  visible boolean not null,
  maj_le timestamptz not null default now(),
  maj_par uuid references public.profiles(id) on delete set null,
  -- un éducateur précis seulement pour la cible 'educateur'
  constraint mon_club_affichage_cible_educateur
    check ((cible = 'educateur') = (educateur_id is not null)),
  -- une seule ligne par club, cible, éducateur et outil (permet l'upsert)
  constraint mon_club_affichage_unique
    unique nulls not distinct (club_id, cible, educateur_id, outil)
);

create index mon_club_affichage_educateur_idx
  on public.mon_club_affichage (educateur_id)
  where educateur_id is not null;

-- Date et auteur du changement remplis par la base, pas par le navigateur
-- (utiles au journal des changements, bloc 10).
create or replace function public.mon_club_horodater()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.maj_le := now();
  new.maj_par := auth.uid();
  return new;
end;
$$;

create trigger mon_club_reglages_horodater
  before insert or update on public.mon_club_reglages
  for each row execute function public.mon_club_horodater();

create trigger mon_club_affichage_horodater
  before insert or update on public.mon_club_affichage
  for each row execute function public.mon_club_horodater();

-- ── 3. Fonctions d'accès ────────────────────────────────────────────────────

-- Vrai si l'utilisateur connecté peut modifier les réglages Mon club de ce
-- club : le compte club, son président, ou un rôle du staff ayant « Mon club »
-- dans la matrice. SECURITY DEFINER pour lire staff_club et role_permissions
-- sans dépendre de leurs règles (même méthode que outils_gere_club).
create or replace function public.mon_club_peut_modifier(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    auth.uid() = p_club_id
    or exists (
      select 1 from public.staff_club sc
      where sc.club_id = p_club_id and sc.user_id = auth.uid()
        and (
          sc.role = 'president'
          or exists (
            select 1 from public.role_permissions rp
            where rp.club_id = p_club_id and rp.role = sc.role and rp.section = 'mon_club'
              and rp.can_view and rp.can_edit
          )
        )
    )
  )
$$;

-- Vrai si l'éducateur est affilié accepté du club (contrôle d'écriture : on ne
-- règle pas le dashboard de quelqu'un qui n'est pas au club).
create or replace function public.mon_club_educateur_affilie(p_club_id uuid, p_educateur_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.club_educateurs ce
    where ce.club_id = p_club_id and ce.educateur_id = p_educateur_id and ce.statut = 'accepte'
  )
$$;

revoke all on function public.mon_club_horodater() from public, anon, authenticated;
revoke all on function public.mon_club_peut_modifier(uuid) from public, anon;
revoke all on function public.mon_club_educateur_affilie(uuid, uuid) from public, anon;
grant execute on function public.mon_club_peut_modifier(uuid) to authenticated, service_role;
grant execute on function public.mon_club_educateur_affilie(uuid, uuid) to authenticated, service_role;

-- ── 4. Règles d'accès ───────────────────────────────────────────────────────

alter table public.mon_club_reglages enable row level security;
alter table public.mon_club_affichage enable row level security;

revoke all on public.mon_club_reglages from anon, authenticated;
revoke all on public.mon_club_affichage from anon, authenticated;
grant select, insert, update, delete on public.mon_club_reglages to authenticated;
grant select, insert, update, delete on public.mon_club_affichage to authenticated;
grant all on public.mon_club_reglages, public.mon_club_affichage to service_role;

-- Mode : le club et son staff le lisent, ses éducateurs affiliés aussi.
create policy "mon_club_reglages_lecture" on public.mon_club_reglages
  for select to authenticated
  using (public.outils_gere_club(club_id) or public.outils_educateur_du_club(club_id));

create policy "mon_club_reglages_ecriture" on public.mon_club_reglages
  for all to authenticated
  using (public.mon_club_peut_modifier(club_id))
  with check (public.mon_club_peut_modifier(club_id));

-- Affichage : le club et son staff lisent tout ; un éducateur affilié lit le
-- réglage commun et ses propres lignes.
create policy "mon_club_affichage_lecture" on public.mon_club_affichage
  for select to authenticated
  using (
    public.outils_gere_club(club_id)
    or (
      public.outils_educateur_du_club(club_id)
      and (cible = 'educateurs' or (cible = 'educateur' and educateur_id = auth.uid()))
    )
  );

-- Écriture : ceux qui ont « Mon club ». Une ligne pour un éducateur précis
-- n'est acceptée que s'il est affilié accepté du club. La suppression reste
-- possible après son départ (nettoyage).
create policy "mon_club_affichage_ajout" on public.mon_club_affichage
  for insert to authenticated
  with check (
    public.mon_club_peut_modifier(club_id)
    and (educateur_id is null or public.mon_club_educateur_affilie(club_id, educateur_id))
  );

create policy "mon_club_affichage_modif" on public.mon_club_affichage
  for update to authenticated
  using (public.mon_club_peut_modifier(club_id))
  with check (
    public.mon_club_peut_modifier(club_id)
    and (educateur_id is null or public.mon_club_educateur_affilie(club_id, educateur_id))
  );

create policy "mon_club_affichage_suppression" on public.mon_club_affichage
  for delete to authenticated
  using (public.mon_club_peut_modifier(club_id));

commit;
