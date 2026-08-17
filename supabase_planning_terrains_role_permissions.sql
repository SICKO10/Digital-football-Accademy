-- Fait respecter, côté base, la matrice de permissions par rôle qui existe déjà
-- côté UI (role_permissions, section 'terrains', configurable par le président
-- dans DashboardClub.jsx → Staff → "Gérer les permissions") — jusqu'ici les RLS
-- d'écriture de terrains/planning_terrains/planning_terrains_exceptions
-- n'exigeaient qu'une appartenance à staff_club, sans regarder le rôle : un
-- membre du staff avec un rôle explicitement privé de droit d'édition sur
-- "Planning terrains" (ex. comptable) pouvait quand même écrire directement
-- via l'API Supabase, même si le bouton était masqué côté UI.
--
-- Ce fichier ne touche PAS aux éducateurs (club_educateurs) : ils n'ont jamais
-- eu de policy d'écriture directe sur ces tables — seulement les fonctions
-- SECURITY DEFINER liberer_creneau/liberer_creneau_date/reclamer_creneau_date
-- (déjà scopées à educateur_id = auth.uid()), qui restent inchangées.

create or replace function peut_gerer_terrains_club(p_club_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    p_club_id = auth.uid()
    or exists (
      select 1 from staff_club sc
      where sc.club_id = p_club_id and sc.user_id = auth.uid()
        and (
          -- Le président a toujours tout, ne peut pas être restreint (même
          -- règle que canEditSection() côté DashboardClub.jsx).
          sc.role = 'president'
          or exists (
            select 1 from role_permissions rp
            where rp.club_id = p_club_id and rp.role = sc.role and rp.section = 'terrains'
              and rp.can_view and rp.can_edit
          )
          -- Pas de ligne configurée pour ce rôle → comportement par défaut
          -- (PERMISSION_DEFAULTS.terrains côté front = ['president', 'directeur_sportif'] ;
          -- 'president' déjà couvert ci-dessus).
          or (
            sc.role = 'directeur_sportif'
            and not exists (
              select 1 from role_permissions rp2
              where rp2.club_id = p_club_id and rp2.role = sc.role and rp2.section = 'terrains'
            )
          )
        )
    )
$$;

grant execute on function peut_gerer_terrains_club(uuid) to authenticated;

-- ── terrains ──
drop policy if exists "dirigeants_insertion_terrains" on terrains;
create policy "dirigeants_insertion_terrains" on terrains
  for insert with check (peut_gerer_terrains_club(club_id));

drop policy if exists "dirigeants_maj_terrains" on terrains;
create policy "dirigeants_maj_terrains" on terrains
  for update using (peut_gerer_terrains_club(club_id));

drop policy if exists "dirigeants_suppression_terrains" on terrains;
create policy "dirigeants_suppression_terrains" on terrains
  for delete using (peut_gerer_terrains_club(club_id));

-- ── planning_terrains ──
drop policy if exists "dirigeants_insertion_planning" on planning_terrains;
create policy "dirigeants_insertion_planning" on planning_terrains
  for insert with check (peut_gerer_terrains_club(club_id));

drop policy if exists "dirigeants_maj_planning" on planning_terrains;
create policy "dirigeants_maj_planning" on planning_terrains
  for update using (peut_gerer_terrains_club(club_id));

drop policy if exists "dirigeants_suppression_planning" on planning_terrains;
create policy "dirigeants_suppression_planning" on planning_terrains
  for delete using (peut_gerer_terrains_club(club_id));

-- ── planning_terrains_exceptions (écriture directe dirigeants — distincte des
-- fonctions liberer_creneau_date/reclamer_creneau_date utilisées par les
-- éducateurs, qui ne passent pas par cette policy) ──
drop policy if exists "dirigeants_ecriture_exceptions" on planning_terrains_exceptions;
create policy "dirigeants_ecriture_exceptions" on planning_terrains_exceptions
  for all
  using (peut_gerer_terrains_club(club_id))
  with check (peut_gerer_terrains_club(club_id));
