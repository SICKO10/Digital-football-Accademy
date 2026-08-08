-- club_educateurs n'a jamais eu ses policies RLS commitées dans ce repo (créée
-- directement dans Supabase). Symptôme observé : un éducateur accepté (visible
-- côté club avec les boutons "Noter"/"Retirer", donc statut = 'accepte') ne
-- voit pourtant pas son affiliation dans son propre dashboard — sa requête
-- .eq('educateur_id', uid) renvoie 0 ligne alors que la ligne existe. La seule
-- explication : aucune policy SELECT n'autorise l'éducateur à lire SA PROPRE
-- ligne (seul le club, via club_id = auth.uid(), semble couvert).
--
-- Les policies RLS "permissive" (le type par défaut) se combinent en OR : cette
-- policy s'ajoute à ce qui existe déjà sans rien casser côté club.

alter table club_educateurs enable row level security;

drop policy if exists "club_educateurs_select_educateur_own" on club_educateurs;
create policy "club_educateurs_select_educateur_own"
  on club_educateurs for select
  using (educateur_id = auth.uid());

-- Au cas où la policy côté club n'existerait pas non plus sous ce nom précis
-- (elle semble fonctionner déjà, mais on la garantit explicitement).
drop policy if exists "club_educateurs_select_club_own" on club_educateurs;
create policy "club_educateurs_select_club_own"
  on club_educateurs for select
  using (club_id = auth.uid());
