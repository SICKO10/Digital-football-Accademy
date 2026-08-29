-- Bibliothèque de procédés d'entraînement : 3 niveaux de partage (au lieu de
-- strictement personnel) — cf. DashboardEducateur.jsx, rubrique Bibliothèque.
-- 'personal' (défaut, comportement actuel) : visible que par le créateur.
-- 'club' : visible par tous les éducateurs affiliés (acceptés) au même club
-- que le créateur au moment du partage (club_id figé à la création, pas
-- réévalué si le coach change de club ensuite).
-- 'platform' : visible par tous les comptes éducateur de Digital Football.

alter table bibliotheque_exercices add column if not exists club_id uuid references profiles(id);
alter table bibliotheque_exercices add column if not exists visibility text not null default 'personal' check (visibility in ('personal', 'club', 'platform'));

drop policy if exists "proprio_exercices" on bibliotheque_exercices;
drop policy if exists "lecture_exercices" on bibliotheque_exercices;
drop policy if exists "ecriture_exercices" on bibliotheque_exercices;
drop policy if exists "modif_exercices" on bibliotheque_exercices;
drop policy if exists "suppr_exercices" on bibliotheque_exercices;

-- Lecture : le créateur voit tout ce qu'il a créé (quelle que soit la
-- visibilité) ; les autres éducateurs voient les lignes 'club' de leur
-- propre club (affiliation acceptée) ou 'platform' (n'importe quel éducateur).
create policy "lecture_exercices" on bibliotheque_exercices
  for select using (
    auth.uid() = educateur_id
    or (
      visibility = 'club' and club_id is not null and exists (
        select 1 from club_educateurs ce
        where ce.club_id = bibliotheque_exercices.club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte'
      )
    )
    or (
      visibility = 'platform' and exists (
        select 1 from profiles p where p.id = auth.uid() and p.plan = 'educateur'
      )
    )
  );

-- Écriture/modification/suppression : réservées au créateur, quelle que soit
-- la visibilité — partager ne cède pas la propriété du procédé.
create policy "ecriture_exercices" on bibliotheque_exercices
  for insert with check (auth.uid() = educateur_id);

create policy "modif_exercices" on bibliotheque_exercices
  for update using (auth.uid() = educateur_id) with check (auth.uid() = educateur_id);

create policy "suppr_exercices" on bibliotheque_exercices
  for delete using (auth.uid() = educateur_id);
