-- Classement « Note éducateur » côté club (Stat équipe).
-- Le dashboard éducateur classe les joueurs sur la moyenne de leurs notes de
-- match (notations_match, sur 10). Le club ne peut pas lire cette table
-- (policy réservée à l'éducateur), donc son classement restait vide. Cette
-- fonction lui renvoie uniquement, par joueur, la moyenne et le nombre de
-- notes — jamais les commentaires ni le détail match par match.
-- Accès : le compte club, ou un membre du staff qui voit la rubrique Sportif.
-- Ne modifie aucune donnée. Peut être relancé sans risque.

create or replace function public.notes_moyennes_equipe_club(p_club_id uuid)
returns table (equipe_joueur_id uuid, moyenne numeric, nb int)
language sql stable security definer
set search_path = public
as $$
  select n.joueur_id, round(avg(n.note)::numeric, 1), count(*)::int
  from notations_match n
  join equipe_joueurs ej on ej.id = n.joueur_id and ej.educateur_id = n.educateur_id
  where not coalesce(n.est_note_equipe, false)
    and n.note is not null
    and ej.educateur_id in (select c.educateur_id from club_categories c where c.club_id = p_club_id)
    and auth.uid() is not null
    and (
      auth.uid() = p_club_id
      or exists (
        select 1 from staff_club sc
        where sc.club_id = p_club_id and sc.user_id = auth.uid()
          and (coalesce(sc.role, 'president') = 'president'
               or coalesce((select rp.can_view from role_permissions rp
                            where rp.club_id = p_club_id and rp.role = sc.role and rp.section = 'sportif'),
                           sc.role = 'directeur_sportif'))
      )
    )
  group by n.joueur_id;
$$;

revoke execute on function public.notes_moyennes_equipe_club(uuid) from public, anon;
grant execute on function public.notes_moyennes_equipe_club(uuid) to authenticated;

notify pgrst, 'reload schema';
