-- ============================================================================
-- Bibliothèque du club, bloc 5 (PLAN-bibliotheque-club.md) : 2026-11-16
-- ----------------------------------------------------------------------------
-- Deux changements, rien d'autre :
--
-- A. bibliotheque_videos : les 4 règles actuelles laissent TOUT compte connecté
--    lire, ajouter, modifier et supprimer n'importe quelle vidéo (y compris
--    celles d'un autre club). Elles sont remplacées par des règles par type :
--      'df'    : lecture = tout compte connecté (comme aujourd'hui) ;
--                écriture = administrateurs Digital Football (admins_coach).
--      'club'  : lecture = compte du club, staff ayant la lecture Bibliothèque,
--                éducateurs acceptés du club, et leurs joueurs si la vidéo
--                est cochée « visible joueurs » ;
--                écriture = compte du club, président, rôles ayant l'écriture
--                Bibliothèque (par défaut : directeur sportif).
--      'perso' : lecture = l'éducateur propriétaire, et ses joueurs si la
--                vidéo est cochée « visible joueurs » ;
--                écriture = l'éducateur propriétaire.
--    Plus un déclencheur : une vidéo ne peut pas changer de type, de club ou
--    de propriétaire après sa création (sinon un membre du staff pourrait
--    transformer une vidéo du club en vidéo personnelle).
--
-- B. bibliotheque_exercices : UNE règle de lecture AJOUTÉE (la règle actuelle
--    lecture_exercices n'est pas modifiée) : les procédés partagés avec
--    Digital Football (partage_platform) deviennent lisibles par un compte
--    club, ou par un membre du staff qui a la lecture Bibliothèque dans son
--    club. Aucun procédé personnel ni partagé seulement au club n'est concerné.
--    Les règles d'écriture et le verrou des outils payants ne changent pas.
--
-- Contenu en production au 2026-11-16 : 39 vidéos 'df', 0 'club', 0 'perso'.
-- Aucune donnée n'est modifiée.
--
-- Avant d'exécuter : sauvegarde ~/Sauvegardes-DigitalFootball/sauvegarder.sh.
-- Tout est dans une seule transaction : en cas d'erreur, rien n'est appliqué.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Fonctions de droits
-- ----------------------------------------------------------------------------

-- 1a. Le compte connecté peut-il lire la bibliothèque Digital Football en tant
--     que club ? Oui pour un compte club, ou pour un membre du staff qui a la
--     lecture Bibliothèque dans au moins un club (réglage du rôle, sinon valeur
--     par défaut : tous les rôles du staff).
create or replace function public.secu_lit_bibliotheque_df()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select auth.uid() is not null
    and (
      exists (
        select 1 from public.profiles pr
        where pr.id = auth.uid() and pr.plan = 'club'
      )
      or exists (
        select 1 from public.staff_club sc
        where sc.user_id = auth.uid()
          and public.a_permission_bibliotheque(sc.club_id, false)
      )
    )
$$;

-- 1b. Le compte connecté est-il un joueur affilié (affiliation acceptée) :
--     - à l'éducateur p_educateur_id (si fourni), ou
--     - à un éducateur accepté du club p_club_id (si fourni) ?
--     Même logique que les règles existantes (annonces_club, seances_prep).
create or replace function public.secu_joueur_affilie(p_educateur_id uuid, p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select auth.uid() is not null
    and (
      (
        p_educateur_id is not null
        and exists (
          select 1 from public.affiliations a
          where a.joueur_id = auth.uid()
            and a.educateur_id = p_educateur_id
            and a.statut = 'accepte'
        )
      )
      or (
        p_club_id is not null
        and exists (
          select 1 from public.affiliations a
          join public.club_educateurs ce on ce.educateur_id = a.educateur_id
          where a.joueur_id = auth.uid()
            and a.statut = 'accepte'
            and ce.club_id = p_club_id
            and ce.statut = 'accepte'
        )
      )
    )
$$;

-- 1c. Déclencheur : type, club, propriétaire et date de création figés après
--     la création. Sans compte connecté (éditeur SQL, serveur) : libre.
create or replace function public.bibliotheque_videos_portee_figee()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if auth.uid() is not null then
    new.type            := old.type;
    new.club_id         := old.club_id;
    new.proprietaire_id := old.proprietaire_id;
    new.created_at      := old.created_at;
  end if;
  return new;
end;
$$;

revoke all on function public.secu_lit_bibliotheque_df() from public, anon;
revoke all on function public.secu_joueur_affilie(uuid, uuid) from public, anon;
revoke all on function public.bibliotheque_videos_portee_figee() from public, anon, authenticated;
grant execute on function public.secu_lit_bibliotheque_df() to authenticated;
grant execute on function public.secu_joueur_affilie(uuid, uuid) to authenticated;

drop trigger if exists bibliotheque_videos_portee_figee on public.bibliotheque_videos;
create trigger bibliotheque_videos_portee_figee
  before update on public.bibliotheque_videos
  for each row execute function public.bibliotheque_videos_portee_figee();

-- ----------------------------------------------------------------------------
-- 2. bibliotheque_videos : règles par type (remplacent bv_select, bv_insert,
--    bv_update, bv_delete qui étaient « auth.uid() IS NOT NULL »)
-- ----------------------------------------------------------------------------
drop policy if exists bv_select on public.bibliotheque_videos;
drop policy if exists bv_insert on public.bibliotheque_videos;
drop policy if exists bv_update on public.bibliotheque_videos;
drop policy if exists bv_delete on public.bibliotheque_videos;

create policy bv_select on public.bibliotheque_videos
  for select to authenticated
  using (
    type = 'df'
    or (type = 'club' and (
      public.a_permission_bibliotheque(club_id, false)
      or public.secu_educateur_accepte_club(club_id)
      or (visible_joueurs and public.secu_joueur_affilie(null, club_id))
    ))
    or (type = 'perso' and (
      proprietaire_id = (select auth.uid())
      or (visible_joueurs and public.secu_joueur_affilie(proprietaire_id, null))
    ))
  );

create policy bv_insert on public.bibliotheque_videos
  for insert to authenticated
  with check (
    (type = 'df' and (select public.est_admin_coach()))
    or (type = 'club' and public.a_permission_bibliotheque(club_id, true))
    or (type = 'perso' and proprietaire_id = (select auth.uid()))
  );

create policy bv_update on public.bibliotheque_videos
  for update to authenticated
  using (
    (type = 'df' and (select public.est_admin_coach()))
    or (type = 'club' and public.a_permission_bibliotheque(club_id, true))
    or (type = 'perso' and proprietaire_id = (select auth.uid()))
  )
  with check (
    (type = 'df' and (select public.est_admin_coach()))
    or (type = 'club' and public.a_permission_bibliotheque(club_id, true))
    or (type = 'perso' and proprietaire_id = (select auth.uid()))
  );

create policy bv_delete on public.bibliotheque_videos
  for delete to authenticated
  using (
    (type = 'df' and (select public.est_admin_coach()))
    or (type = 'club' and public.a_permission_bibliotheque(club_id, true))
    or (type = 'perso' and proprietaire_id = (select auth.uid()))
  );

-- ----------------------------------------------------------------------------
-- 3. bibliotheque_exercices : lecture des procédés Digital Football par un
--    club ou son staff (règle AJOUTÉE, lecture_exercices reste telle quelle)
-- ----------------------------------------------------------------------------
drop policy if exists lecture_exercices_df_club on public.bibliotheque_exercices;
create policy lecture_exercices_df_club on public.bibliotheque_exercices
  for select to authenticated
  using (
    partage_platform
    and (select public.secu_lit_bibliotheque_df())
  );

commit;
