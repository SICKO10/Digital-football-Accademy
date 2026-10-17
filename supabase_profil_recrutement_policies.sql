-- Moteur de recrutement : remplace la policy trop large
-- « profil_recrutement_policy » (FOR ALL, auth.uid() IS NOT NULL), qui donnait
-- à n'importe quel compte connecté le droit de lire, créer, modifier et
-- supprimer le profil de recrutement de n'importe quel joueur (visibilité,
-- partage du bilan médical compris) — les policies s'additionnant, elle
-- annulait les deux autres.
--
-- Conservées telles quelles :
--   - joueur_gere_son_profil_recrutement (le joueur gère son propre profil)
--   - staff_lit_profils_recrutement_visibles (éducateurs/clubs lisent les
--     profils rendus visibles par le joueur)
-- Ajoutées (strictement ce que l'application utilise) :
--   - l'éducateur — ou son dirigeant délégué — lit et enregistre les
--     statistiques des joueurs de SON effectif (DashboardEducateur, remontée
--     auto après un match) ; pas de suppression ;
--   - le parent accepté lit le profil de son enfant (dashboard parent).

begin;

drop policy if exists "profil_recrutement_policy" on public.profil_recrutement;

drop policy if exists "educateur_lit_recrutement_effectif" on public.profil_recrutement;
drop policy if exists "educateur_cree_recrutement_effectif" on public.profil_recrutement;
drop policy if exists "educateur_maj_recrutement_effectif" on public.profil_recrutement;
drop policy if exists "parent_lit_recrutement_enfant" on public.profil_recrutement;

-- Effectif de l'éducateur connecté, ou de l'éducateur dont il est dirigeant délégué.
create policy "educateur_lit_recrutement_effectif" on public.profil_recrutement
  for select to authenticated
  using (exists (
    select 1 from public.equipe_joueurs ej
    where ej.joueur_id = profil_recrutement.joueur_id
      and (ej.educateur_id = auth.uid()
           or exists (select 1 from public.dirigeant_acces da where da.educateur_id = ej.educateur_id and da.dirigeant_id = auth.uid() and da.statut = 'accepte'))
  ));

create policy "educateur_cree_recrutement_effectif" on public.profil_recrutement
  for insert to authenticated
  with check (exists (
    select 1 from public.equipe_joueurs ej
    where ej.joueur_id = profil_recrutement.joueur_id
      and (ej.educateur_id = auth.uid()
           or exists (select 1 from public.dirigeant_acces da where da.educateur_id = ej.educateur_id and da.dirigeant_id = auth.uid() and da.statut = 'accepte'))
  ));

create policy "educateur_maj_recrutement_effectif" on public.profil_recrutement
  for update to authenticated
  using (exists (
    select 1 from public.equipe_joueurs ej
    where ej.joueur_id = profil_recrutement.joueur_id
      and (ej.educateur_id = auth.uid()
           or exists (select 1 from public.dirigeant_acces da where da.educateur_id = ej.educateur_id and da.dirigeant_id = auth.uid() and da.statut = 'accepte'))
  ))
  with check (exists (
    select 1 from public.equipe_joueurs ej
    where ej.joueur_id = profil_recrutement.joueur_id
      and (ej.educateur_id = auth.uid()
           or exists (select 1 from public.dirigeant_acces da where da.educateur_id = ej.educateur_id and da.dirigeant_id = auth.uid() and da.statut = 'accepte'))
  ));

create policy "parent_lit_recrutement_enfant" on public.profil_recrutement
  for select to authenticated
  using (exists (
    select 1 from public.parents_acces pa
    where pa.joueur_id = profil_recrutement.joueur_id and pa.parent_id = auth.uid() and pa.statut = 'accepte'
  ));

commit;
