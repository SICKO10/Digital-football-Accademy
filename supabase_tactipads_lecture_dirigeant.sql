-- Tacticboard : un dirigeant délégué (dirigeant_acces accepté) peut LIRE les
-- schémas sauvegardés (tactipads) et les dossiers (schemas_dossiers) de
-- l'éducateur dont il a la délégation. Lecture seule : l'écriture reste
-- réservée à l'éducateur (policies « educateur owns » / « sd_own » inchangées),
-- et l'interface masque les actions d'écriture (Tactipad, lectureSeule).
begin;
drop policy if exists "dirigeant_lit_tactipads" on public.tactipads;
create policy "dirigeant_lit_tactipads" on public.tactipads
  for select to authenticated
  using (exists (
    select 1 from public.dirigeant_acces da
    where da.educateur_id = tactipads.educateur_id and da.dirigeant_id = auth.uid() and da.statut = 'accepte'
  ));
drop policy if exists "dirigeant_lit_schemas_dossiers" on public.schemas_dossiers;
create policy "dirigeant_lit_schemas_dossiers" on public.schemas_dossiers
  for select to authenticated
  using (exists (
    select 1 from public.dirigeant_acces da
    where da.educateur_id = schemas_dossiers.educateur_id and da.dirigeant_id = auth.uid() and da.statut = 'accepte'
  ));
commit;
