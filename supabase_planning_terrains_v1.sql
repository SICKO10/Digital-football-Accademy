-- V1 "planning natif" (générateur + réclamation de créneau) — cf.
-- PlanningTerrains.jsx. S'appuie sur les tables terrains/planning_terrains
-- existantes (supabase_planning_terrains.sql), ne les recrée pas.

-- Couleur d'équipe, utilisée pour colorer ses créneaux dans le planning.
-- Nullable : sans couleur choisie, l'app calcule une couleur de secours à
-- partir d'une palette fixe (ordre des catégories) côté client.
alter table club_categories add column if not exists couleur text;

-- Plage horaire d'ouverture des terrains du club (8h-22h par défaut) —
-- borne les heures proposées dans le formulaire de créneau.
alter table profiles add column if not exists planning_heure_ouverture time default '08:00';
alter table profiles add column if not exists planning_heure_fermeture time default '22:00';

-- Réclamation d'un créneau libéré par un autre éducateur — pendant
-- symétrique de liberer_creneau (supabase_planning_terrains.sql) : même
-- raisonnement de sécurité (RLS ne permet pas de restreindre une UPDATE à
-- certaines colonnes, donc fonction SECURITY DEFINER dédiée), mais aucune
-- policy UPDATE n'existe pour les éducateurs sur planning_terrains — cette
-- fonction est le seul chemin qui leur permette de prendre un créneau.
-- Assigne l'éducateur appelant + le nom de son équipe (déduit de
-- club_categories), et lève une erreur si le créneau n'est plus libéré
-- entre-temps (deux éducateurs qui cliquent en même temps).
create or replace function reclamer_creneau(p_creneau_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id uuid;
  v_libere boolean;
  v_equipe text;
begin
  select club_id, libere into v_club_id, v_libere from planning_terrains where id = p_creneau_id;
  if v_club_id is null then
    raise exception 'Créneau introuvable';
  end if;
  if not v_libere then
    raise exception 'Ce créneau n''est plus disponible';
  end if;
  if not exists (
    select 1 from club_educateurs ce where ce.club_id = v_club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte'
  ) then
    raise exception 'Tu n''es pas affilié à ce club';
  end if;

  select trim(coalesce(cc.nom, '') || ' ' || coalesce(cc.equipe, '')) into v_equipe
  from club_categories cc where cc.club_id = v_club_id and cc.educateur_id = auth.uid() limit 1;

  update planning_terrains
  set educateur_id = auth.uid(), equipe = coalesce(nullif(v_equipe, ''), equipe), libere = false, libere_par = null, libere_at = null
  where id = p_creneau_id;
end;
$$;

grant execute on function reclamer_creneau(uuid) to authenticated;
