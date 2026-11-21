-- Un dirigeant délégué en lecture sur la rubrique Compétition peut voir la
-- convocation publiée de l'éducateur qui l'a invité (programme affiché sur son
-- accueil). Jusqu'ici seul le niveau « édition » le permettait.
-- Lecture seule : aucune écriture n'est ouverte.
create policy "Dirigeant lit convocations si delegue lecture"
  on public.convocations
  for select
  to authenticated
  using (
    exists (
      select 1 from public.dirigeant_acces da
      where da.educateur_id = convocations.educateur_id
        and da.dirigeant_id = auth.uid()
        and da.statut = 'accepte'
        and (da.permissions ->> 'competition') in ('lecture', 'edition')
    )
  );
