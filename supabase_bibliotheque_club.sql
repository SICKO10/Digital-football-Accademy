-- ============================================================================
-- Bibliothèque du club, bloc 1 (PLAN-bibliotheque-club.md) : 2026-11-16
-- ----------------------------------------------------------------------------
-- Crée l'endroit où un club range SES procédés, séparé de bibliotheque_exercices
-- (qui reste intacte : aucune règle, colonne ou donnée existante n'est touchée).
--
-- Qui fait quoi :
--   lire      : compte du club, président, rôles du staff ayant la lecture
--               (par défaut : tous les rôles du staff), éducateurs ACCEPTÉS du club
--               (même sans l'outil payant « Bibliothèque » : décision 1 du plan).
--   écrire    : compte du club, président, rôles ayant l'écriture
--   modifier     (par défaut : directeur sportif seulement).
--   supprimer
--   Un club ne voit jamais la bibliothèque d'un autre club.
--
-- Contenu :
--   1. role_permissions : la section 'bibliotheque' devient réglable.
--   2. Table bibliotheque_club_procedes.
--   3. Déclencheur : auteur et dates posés par la base (impossibles à falsifier).
--   4. Fonctions de droits a_permission_bibliotheque et secu_educateur_accepte_club.
--   5. Règles (RLS) et droits d'accès.
--
-- Avant d'exécuter : sauvegarde ~/Sauvegardes-DigitalFootball/sauvegarder.sh.
-- Tout est dans une seule transaction : en cas d'erreur, rien n'est appliqué.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Section 'bibliotheque' autorisée dans role_permissions
--    (liste réelle relevée en production au bloc 0 + 'bibliotheque')
-- ----------------------------------------------------------------------------
alter table public.role_permissions drop constraint role_permissions_section_check;
alter table public.role_permissions add constraint role_permissions_section_check
  check (section = any (array[
    'sportif', 'seances', 'terrains', 'deplacements', 'budget', 'sponsors',
    'repartition_bus', 'profil', 'evenements', 'stages', 'organigramme', 'staff',
    'inventaire', 'newsletter', 'taches', 'projet_club_cff4', 'mon_club',
    'bibliotheque'
  ]::text[]));

-- ----------------------------------------------------------------------------
-- 2. Table des procédés du club
--    Mêmes champs utiles que bibliotheque_exercices, sans educateur_id,
--    partage_club ni partage_platform (un procédé du club ne sort pas du club).
-- ----------------------------------------------------------------------------
create table public.bibliotheque_club_procedes (
  id                   uuid primary key default gen_random_uuid(),
  club_id              uuid not null references public.profiles(id) on delete cascade,
  auteur_id            uuid references public.profiles(id) on delete set null,
  auteur_nom           text not null default '',
  -- 'club' : créé dans le club ; 'digital_football' : copie d'un procédé de la
  -- bibliothèque Digital Football (bloc 7) ; 'educateur' : procédé partagé par un
  -- éducateur du club et adopté par le club (bloc 9, optionnel).
  origine              text not null default 'club'
                       check (origine in ('club', 'digital_football', 'educateur')),
  -- Procédé d'origine pour une copie. Passe à vide si l'original est supprimé :
  -- la copie du club reste.
  origine_id           uuid references public.bibliotheque_exercices(id) on delete set null,
  type                 text not null
                       check (type in ('jeu', 'exercice', 'situation', 'echauffement')),
  nom                  text not null check (length(btrim(nom)) > 0),
  theme                text default '',
  description          text default '',
  consignes            text default '',
  variables            text default '',
  duree                integer,
  nb_joueurs           text default '',
  tags                 text default '',
  objectif             text,
  but                  text,
  criteres_realisation text,
  principe_jeu         text,
  organisation         text,
  categorie_age        text[] default array['Pour tous']::text[],
  schema_data          jsonb,
  schema_png           text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on table public.bibliotheque_club_procedes is
  'Procédés appartenant à un club (Bibliothèque du club). Lus par le staff selon role_permissions section bibliotheque et par les éducateurs acceptés du club ; écrits par les rôles ayant l''écriture.';

create index bibliotheque_club_procedes_club_idx
  on public.bibliotheque_club_procedes (club_id, created_at desc);
create index bibliotheque_club_procedes_auteur_idx
  on public.bibliotheque_club_procedes (auteur_id);
create index bibliotheque_club_procedes_origine_idx
  on public.bibliotheque_club_procedes (origine_id);

-- ----------------------------------------------------------------------------
-- 3. Déclencheur : la base pose l'auteur et les dates
--    - à la création : auteur = compte connecté, nom de l'auteur figé (il reste
--      affiché même si la personne quitte le club : décision 2 du plan).
--    - à la modification : club, auteur, origine et date de création ne bougent
--      pas. Exception : auteur_id et origine_id peuvent passer à vide (compte ou
--      original supprimé, via « on delete set null »), sinon ces suppressions
--      seraient bloquées.
--    Sans compte connecté (éditeur SQL, serveur) : les valeurs fournies sont gardées.
-- ----------------------------------------------------------------------------
create or replace function public.bibliotheque_club_procedes_avant_ecriture()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_nom text;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.auteur_id := auth.uid();
      select nullif(btrim(coalesce(pr.prenom, '') || ' ' || coalesce(pr.nom, '')), '')
        into v_nom
        from public.profiles pr
       where pr.id = auth.uid();
      new.auteur_nom := coalesce(v_nom, '');
    end if;
    new.created_at := now();
    new.updated_at := now();
  else
    new.club_id    := old.club_id;
    new.auteur_nom := old.auteur_nom;
    new.origine    := old.origine;
    new.created_at := old.created_at;
    new.auteur_id  := case when new.auteur_id  is null then null else old.auteur_id  end;
    new.origine_id := case when new.origine_id is null then null else old.origine_id end;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger bibliotheque_club_procedes_avant_ecriture
  before insert or update on public.bibliotheque_club_procedes
  for each row execute function public.bibliotheque_club_procedes_avant_ecriture();

-- ----------------------------------------------------------------------------
-- 4a. Droit « Bibliothèque » du club (staff)
--     p_edition = false : lecture ; true (ou vide) : écriture.
--     Ordre : compte du club > président > réglage du rôle s'il existe >
--     valeurs par défaut (lecture : tous les rôles du staff ; écriture :
--     directeur sportif).
--     Même règle que l'écran (DashboardClub.jsx) : écrire suppose aussi de voir.
-- ----------------------------------------------------------------------------
create or replace function public.a_permission_bibliotheque(p_club_id uuid, p_edition boolean)
returns boolean
language sql
stable
security definer
set search_path to ''
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
          and (
            sc.role = 'president'
            or exists (
              select 1 from public.role_permissions rp
              where rp.club_id = p_club_id
                and rp.role = sc.role
                and rp.section = 'bibliotheque'
                and coalesce(rp.can_view, false)
                and (not coalesce(p_edition, true) or coalesce(rp.can_edit, false))
            )
            or (
              not exists (
                select 1 from public.role_permissions rp2
                where rp2.club_id = p_club_id
                  and rp2.role = sc.role
                  and rp2.section = 'bibliotheque'
              )
              and (not coalesce(p_edition, true) or sc.role = 'directeur_sportif')
            )
          )
      )
    )
$$;

-- ----------------------------------------------------------------------------
-- 4b. Éducateur accepté du club (lecture seule, quel que soit l'outil acheté)
-- ----------------------------------------------------------------------------
create or replace function public.secu_educateur_accepte_club(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select auth.uid() is not null
    and p_club_id is not null
    and exists (
      select 1 from public.club_educateurs ce
      where ce.club_id = p_club_id
        and ce.educateur_id = auth.uid()
        and ce.statut = 'accepte'
    )
$$;

revoke all on function public.a_permission_bibliotheque(uuid, boolean) from public, anon;
revoke all on function public.secu_educateur_accepte_club(uuid) from public, anon;
revoke all on function public.bibliotheque_club_procedes_avant_ecriture() from public, anon, authenticated;
grant execute on function public.a_permission_bibliotheque(uuid, boolean) to authenticated;
grant execute on function public.secu_educateur_accepte_club(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 5. Règles (RLS) et droits d'accès
--    Volontairement SANS la règle verrou_outils / outil_ferme : l'éducateur
--    affilié lit la bibliothèque de son club même sans l'outil payant.
-- ----------------------------------------------------------------------------
alter table public.bibliotheque_club_procedes enable row level security;

create policy bcp_lecture on public.bibliotheque_club_procedes
  for select to authenticated
  using (
    public.a_permission_bibliotheque(club_id, false)
    or public.secu_educateur_accepte_club(club_id)
  );

create policy bcp_ajout on public.bibliotheque_club_procedes
  for insert to authenticated
  with check (public.a_permission_bibliotheque(club_id, true));

create policy bcp_modification on public.bibliotheque_club_procedes
  for update to authenticated
  using (public.a_permission_bibliotheque(club_id, true))
  with check (public.a_permission_bibliotheque(club_id, true));

create policy bcp_suppression on public.bibliotheque_club_procedes
  for delete to authenticated
  using (public.a_permission_bibliotheque(club_id, true));

revoke all on table public.bibliotheque_club_procedes from public, anon, authenticated;
grant select, insert, update, delete on table public.bibliotheque_club_procedes to authenticated;
grant all on table public.bibliotheque_club_procedes to service_role;

commit;
