-- Bug: un dirigeant délégué voit bien l'effectif et les entraînements/matchs
-- (policies "dirigeant lecture effectif" / "dirigeant_lit_..." déjà en place),
-- mais pas les réponses de présence (disponibilites) : la seule policy SELECT
-- existante ("educateur_read_dispos") vérifie equipe_joueurs.educateur_id =
-- auth.uid(), ce qui échoue pour la session réelle d'un dirigeant. D'où
-- "0 Présent / N Sans réponse" alors que les joueurs ont bien répondu.
--
-- Gating par permission : entrainements pour les dispos de séance,
-- competition pour les dispos de match — miroir des policies déjà en place
-- sur entrainements/matchs_equipe.

CREATE POLICY "dirigeant_lit_disponibilites_entrainement"
ON public.disponibilites
FOR SELECT
USING (
  seance_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM equipe_joueurs ej
    JOIN dirigeant_acces da ON da.educateur_id = ej.educateur_id
    WHERE ej.joueur_id = disponibilites.joueur_id
      AND da.dirigeant_id = auth.uid()
      AND da.statut = 'accepte'
      AND (da.permissions ->> 'entrainements') = ANY (ARRAY['lecture', 'edition'])
  )
);

CREATE POLICY "dirigeant_lit_disponibilites_match"
ON public.disponibilites
FOR SELECT
USING (
  match_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM equipe_joueurs ej
    JOIN dirigeant_acces da ON da.educateur_id = ej.educateur_id
    WHERE ej.joueur_id = disponibilites.joueur_id
      AND da.dirigeant_id = auth.uid()
      AND da.statut = 'accepte'
      AND (da.permissions ->> 'competition') = ANY (ARRAY['lecture', 'edition'])
  )
);
