-- NE PAS EXÉCUTER. Annulation du bloc 8 (supabase_saisons_verrouillage_categories.sql).
-- Rouvre l'auto-déclaration du coach sur club_categories, exactement comme
-- avant le bloc 8 (règles de supabase_club_categories_educateur_declare.sql).
--
-- Verrou : la ligne ci-dessous bloque tout le fichier. Ne la retirer que si
-- Claude le demande explicitement pour annuler le bloc 8.
do $$ begin raise exception 'Fichier d''annulation verrouillé : rien n''a été modifié.'; end $$;

begin;

drop trigger if exists saison_garde_attribution_equipe on club_categories;
drop function if exists public.saison_garde_attribution_equipe();
drop function if exists public.saison_peut_attribuer_equipe(uuid, uuid);

drop policy if exists "educateur_declare_sa_categorie" on club_categories;
create policy "educateur_declare_sa_categorie" on club_categories
  for insert
  with check (
    educateur_id = auth.uid()
    and exists (
      select 1 from club_educateurs ce
      where ce.club_id = club_categories.club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte'
    )
  );

drop policy if exists "educateur_reclame_categorie_vacante" on club_categories;
create policy "educateur_reclame_categorie_vacante" on club_categories
  for update
  using (
    educateur_id is null
    and exists (
      select 1 from club_educateurs ce
      where ce.club_id = club_categories.club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte'
    )
  )
  with check (educateur_id = auth.uid());

commit;
