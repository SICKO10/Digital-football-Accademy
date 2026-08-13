-- Permet au club (ou à un rôle staff délégué avec can_edit sur 'terrains') d'affecter
-- un terrain à un match, depuis le Planning des terrains — sans quoi seul l'éducateur
-- propriétaire du match (ou un dirigeant avec la permission 'competition': 'edition')
-- peut écrire sur matchs_equipe (cf. policy "educateur_matchs"), ce qui bloquerait le
-- bouton "+ Affecter un terrain" côté club avec une erreur RLS.
--
-- Volontairement une RPC dédiée plutôt qu'une policy UPDATE large sur matchs_equipe :
-- ça limite strictement ce que le club peut modifier à terrain_id, sans lui donner un
-- accès en écriture au reste du match (score, adversaire, date...), qui reste réservé
-- à l'éducateur/dirigeant. Même approche que liberer_creneau_date/reclamer_creneau_date
-- (supabase_planning_terrains_exceptions.sql).
create or replace function affecter_terrain_match(p_match_id uuid, p_terrain_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_educateur_id uuid;
  v_club_id uuid;
  v_autorise boolean;
begin
  select educateur_id into v_educateur_id from matchs_equipe where id = p_match_id;
  if v_educateur_id is null then
    raise exception 'Match introuvable';
  end if;

  select club_id into v_club_id from club_educateurs
  where educateur_id = v_educateur_id and statut = 'accepte'
  limit 1;
  if v_club_id is null then
    raise exception 'Ce match n''est rattaché à aucun club';
  end if;

  if p_terrain_id is not null and not exists (select 1 from terrains where id = p_terrain_id and club_id = v_club_id) then
    raise exception 'Ce terrain n''appartient pas au club de ce match';
  end if;

  select
    v_club_id = auth.uid()
    or exists (
      select 1 from staff_club sc
      where sc.club_id = v_club_id and sc.user_id = auth.uid()
        and (
          sc.role = 'president'
          or exists (
            select 1 from role_permissions rp
            where rp.club_id = v_club_id and rp.role = sc.role and rp.section = 'terrains' and rp.can_edit = true
          )
        )
    )
  into v_autorise;

  if not v_autorise then
    raise exception 'Tu n''as pas le droit de modifier le planning des terrains de ce club';
  end if;

  update matchs_equipe set terrain_id = p_terrain_id where id = p_match_id;
end;
$$;

grant execute on function affecter_terrain_match(uuid, uuid) to authenticated;
