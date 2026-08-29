-- Suite de supabase_bibliotheque_visibilite.sql : un procédé pouvait être
-- partagé dans UNE seule des 3 rubriques (visibility enum). Passe à un
-- modèle additif — un procédé reste toujours dans "Ma bibliothèque" (son
-- créateur le voit toujours) ET peut être partagé en club ET/OU en
-- Digital Football simultanément, plutôt que de choisir une seule case.

alter table bibliotheque_exercices add column if not exists partage_club boolean not null default false;
alter table bibliotheque_exercices add column if not exists partage_platform boolean not null default false;

-- Backfill depuis l'ancien modèle (préserve les partages déjà faits).
update bibliotheque_exercices set partage_club = true where visibility = 'club';
update bibliotheque_exercices set partage_platform = true where visibility = 'platform';

alter table bibliotheque_exercices drop column if exists visibility;

drop policy if exists "lecture_exercices" on bibliotheque_exercices;
create policy "lecture_exercices" on bibliotheque_exercices
  for select using (
    auth.uid() = educateur_id
    or (
      partage_club and club_id is not null and exists (
        select 1 from club_educateurs ce
        where ce.club_id = bibliotheque_exercices.club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte'
      )
    )
    or (
      partage_platform and exists (
        select 1 from profiles p where p.id = auth.uid() and p.plan = 'educateur'
      )
    )
  );
