-- Ressenti collectif des séances, côté club (Stat équipe).
-- Le club voit, séance par séance, la MOYENNE de l'équipe en charge de
-- travail (RPE sur 10) et en plaisir (sur 5). Jamais les réponses
-- individuelles : la fonction ne renvoie que des moyennes, et seulement à
-- partir de 3 réponses (en dessous, une moyenne trahirait la note d'un
-- joueur). Les tables restent fermées au club : aucune policy n'est ajoutée.
-- Accès : le compte club, ou un membre du staff qui voit la rubrique Sportif.
-- Ne modifie aucune donnée. Peut être relancé sans risque.

create or replace function public.ressenti_collectif_equipe(p_categorie_id uuid)
returns table (
  demande_id uuid,
  titre text,
  date_seance date,
  nb_reponses int,
  rpe_moyen numeric,
  rpe_estime boolean,
  plaisir_moyen numeric
)
language sql stable security definer
set search_path = public
as $$
  with autorise as (
    select exists (
      select 1 from club_categories c
      where c.id = p_categorie_id
        and auth.uid() is not null
        and (
          auth.uid() = c.club_id
          or exists (
            select 1 from staff_club sc
            where sc.club_id = c.club_id and sc.user_id = auth.uid()
              and (coalesce(sc.role, 'president') = 'president'
                   or coalesce((select rp.can_view from role_permissions rp
                                where rp.club_id = c.club_id and rp.role = sc.role and rp.section = 'sportif'),
                               sc.role = 'directeur_sportif'))
          )
        )
    ) as ok
  )
  select
    d.id,
    d.titre,
    d.date_seance,
    count(r.id)::int,
    case when count(r.id) >= 3 then round(avg(coalesce(r.rpe, r.charge_travail * 2))::numeric, 1) end,
    coalesce(bool_or(r.rpe is null), false),
    case when count(r.id) >= 3 then round(avg(r.notion_plaisir)::numeric, 1) end
  from seances_notes_demandes d
  left join seances_notes_joueurs r on r.demande_id = d.id
  where d.club_categorie_id = p_categorie_id
    and (select ok from autorise)
  group by d.id, d.titre, d.date_seance
  order by d.date_seance desc;
$$;

revoke execute on function public.ressenti_collectif_equipe(uuid) from public, anon;
grant execute on function public.ressenti_collectif_equipe(uuid) to authenticated;

notify pgrst, 'reload schema';
