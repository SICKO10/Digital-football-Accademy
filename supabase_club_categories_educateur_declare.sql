-- Permet à un éducateur affilié (club_educateurs, statut='accepte') de déclarer
-- lui-même sa catégorie/équipe (ex. "U18 A") dès sa première visite de l'onglet
-- Mon Équipe, plutôt que d'attendre que le club le fasse pour lui — cf.
-- DashboardEducateur.jsx (prompt "Quelle catégorie et équipe gères-tu ?").
-- Jusqu'ici seul le club pouvait créer/assigner une ligne club_categories.
--
-- Additif uniquement (nouvelles policies, n'enlève aucun droit existant au club).

-- ── Déclarer une toute nouvelle catégorie (aucune ligne club_categories
-- correspondante n'existe encore chez ce club) — uniquement pour lui-même. ──
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

-- ── Réclamer une catégorie déjà créée par le club mais pas encore assignée
-- (educateur_id null) — jamais réassigner une catégorie qui a déjà un coach. ──
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

-- ── Se retirer de SA propre catégorie (educateur_id → null uniquement),
-- utilisé à la clôture de saison (GestionCloturesSaison.jsx) pour que le
-- prochain éducateur qui reprendra cette équipe (ou lui-même la saison
-- suivante) soit re-invité à déclarer sa catégorie/équipe. ──
drop policy if exists "educateur_quitte_sa_categorie" on club_categories;
create policy "educateur_quitte_sa_categorie" on club_categories
  for update
  using (educateur_id = auth.uid())
  with check (educateur_id is null);
