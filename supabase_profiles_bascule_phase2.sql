-- Bascule A — phase 2 : rétablit les lectures légitimes de profiles cassées
-- depuis l'activation de la policy stricte profiles_select_own_or_delegated
-- (chacun ne lit plus que son propre profil + délégations).
-- La phase 1 (code seul, déjà faite) a basculé vers profiles_public toutes
-- les lectures d'informations publiques. Restent ici les cas qui demandent
-- un droit côté base. Rien n'est retiré ; aucun accès anonyme n'est ajouté ;
-- les colonnes sensibles (email, Stripe, abonnement, licence, date de
-- naissance, code club, bannissement, parrainage) restent hors de la vue.
--
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE.

begin;

-- 1. Vue publique : ajout des réglages publics d'un profil/club (page club,
--    thème, planning, droits des éducateurs) — aucune donnée sensible.
--    Les 36 colonnes existantes restent identiques et dans le même ordre.
create or replace view public.profiles_public as
select
  id, prenom, nom, poste, plan, abonnement_actif, club, niveau_equipe,
  categorie, region, ville, pied,
  matchs_officiel, matchs_amical, minutes_jouees, buts_pied_droit,
  buts_pied_gauche, buts_tete, buts_total, passes_decisives, cleansheets,
  clip_url, avatar_url,
  points_forts, a_ameliorer, carte_fifa_url, style_de_jeu,
  type_recruteur, description, recherche_profil,
  (numero_licence is not null) as licencie_fff,
  disponibilite, specialites, services_proposes,
  verified, created_at,
  -- ajouts phase 2
  bio, video_url, video_description,
  couleur_principale, couleur_secondaire, image_fond_url, image_hero_url, slogan,
  stades, terrain_fond_url,
  planning_heure_ouverture, planning_heure_fermeture, planning_semaine_url, planning_semaine_publie_le,
  educateurs_editent_projet_sportif, educateurs_editent_planification
from public.profiles
where not coalesce(banni, false);

grant select on public.profiles_public to anon, authenticated;

-- 2. Dashboard Coach (administration) : lecture complète des profils pour les
--    admins (liste des utilisateurs, abonnements, parrainages, demandes).
--    est_admin_coach() est SECURITY DEFINER (pas de récursion RLS).
drop policy if exists "profiles_select_admin_coach" on public.profiles;
create policy "profiles_select_admin_coach" on public.profiles
  for select to authenticated
  using (public.est_admin_coach());

-- 3. Liens de travail : un club (ou son staff) lit le profil de ses
--    éducateurs affiliés et de ses membres staff ; un éducateur lit le profil
--    des joueurs de son effectif (equipe_joueurs) ou affiliés à lui. Ce sont
--    exactement les écrans qui affichent/envoient un email à ces personnes
--    (listes du club, invitations, réinitialisation d'accès, notifications).
drop policy if exists "profiles_select_liens_travail" on public.profiles;
create policy "profiles_select_liens_travail" on public.profiles
  for select to authenticated
  using (
    -- club ou staff du club → ses éducateurs affiliés
    exists (
      select 1 from public.club_educateurs ce
      where ce.educateur_id = profiles.id and ce.statut = 'accepte'
        and (ce.club_id = auth.uid()
             or exists (select 1 from public.staff_club sc where sc.club_id = ce.club_id and sc.user_id = auth.uid()))
    )
    -- club → ses membres staff
    or exists (select 1 from public.staff_club sc where sc.user_id = profiles.id and sc.club_id = auth.uid())
    -- éducateur → joueurs de son effectif
    or exists (select 1 from public.equipe_joueurs ej where ej.joueur_id = profiles.id and ej.educateur_id = auth.uid())
    -- éducateur → joueurs affiliés
    or exists (select 1 from public.affiliations a where a.joueur_id = profiles.id and a.educateur_id = auth.uid())
  );

-- 4. Rejoindre un club par son code (dashboard éducateur) : code_club n'est
--    pas public — recherche exacte côté serveur, ne renvoie que l'identité
--    publique du club.
create or replace function public.club_par_code(p_code text)
returns table (id uuid, club text, prenom text, nom text)
language sql security definer stable set search_path to 'public'
as $$
  select p.id, p.club, p.prenom, p.nom from public.profiles p
  where p.plan = 'club' and lower(p.code_club) = lower(trim(p_code)) and not coalesce(p.banni, false)
  limit 1;
$$;
revoke execute on function public.club_par_code(text) from public, anon;
grant execute on function public.club_par_code(text) to authenticated;

-- 5. Recherche d'un utilisateur à ajouter au staff (dashboard club) : par nom,
--    prénom ou email EXACT — l'email n'est jamais renvoyé ni cherchable
--    partiellement. Réservée à un compte club ou à son staff.
create or replace function public.rechercher_utilisateurs_staff(p_recherche text)
returns table (id uuid, prenom text, nom text, plan text)
language sql security definer stable set search_path to 'public'
as $$
  select p.id, p.prenom, p.nom, p.plan from public.profiles p
  where length(trim(p_recherche)) >= 2
    and p.id <> auth.uid()
    and not coalesce(p.banni, false)
    and (p.prenom ilike '%' || trim(p_recherche) || '%' or p.nom ilike '%' || trim(p_recherche) || '%' or lower(p.email) = lower(trim(p_recherche)))
    and (exists (select 1 from public.profiles c where c.id = auth.uid() and c.plan = 'club')
         or exists (select 1 from public.staff_club sc where sc.user_id = auth.uid()))
  limit 8;
$$;
revoke execute on function public.rechercher_utilisateurs_staff(text) from public, anon;
grant execute on function public.rechercher_utilisateurs_staff(text) to authenticated;

commit;
