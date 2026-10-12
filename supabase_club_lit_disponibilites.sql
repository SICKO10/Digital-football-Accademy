-- Le dashboard club (chargerClassements, DashboardClub.jsx) se sert maintenant
-- des réponses des joueurs au sondage de présence (disponibilites) quand
-- l'éducateur n'a pas validé la séance, comme le fait déjà DashboardEducateur.
-- Jusqu'ici seuls le joueur, son éducateur et les dirigeants y avaient accès :
-- sans cette policy, le club ne voyait aucune réponse et son taux de présence
-- différait de celui du coach.
--
-- Lecture seule, entraînements uniquement (seance_id), joueurs de l'effectif
-- d'un éducateur accepté dans le club. Compte club (auth.uid() = club_id) ou
-- staff du club, même règle que les autres policies club (cf. cpa_schemas).

drop policy if exists "club_lit_disponibilites_entrainement" on public.disponibilites;

create policy "club_lit_disponibilites_entrainement"
on public.disponibilites
for select
using (
  seance_id is not null
  and exists (
    select 1
    from equipe_joueurs ej
    join club_educateurs ce on ce.educateur_id = ej.educateur_id and ce.statut = 'accepte'
    where ej.joueur_id = disponibilites.joueur_id
      and (
        ce.club_id = auth.uid()
        or exists (select 1 from staff_club sc where sc.club_id = ce.club_id and sc.user_id = auth.uid())
      )
  )
);
