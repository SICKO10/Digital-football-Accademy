-- Ferme un trou de sécurité réel : une policy USING(true) grande ouverte
-- coexistait avec les policies scopées par club sur projets_club (et de même
-- sur projet_etapes/projet_budget/projet_actions), ce qui les annulait —
-- n'importe quel compte authentifié pouvait lire/écrire les projets de
-- n'importe quel club.
-- Déjà fait par ailleurs au moment d'appliquer cette migration (vérifié en
-- direct) : projets_all/etapes_all/budget_all supprimées, projet_actions
-- absente, projet_etapes a déjà ses policies membres_club_lecture/ecriture_etapes
-- (identiques à celles ci-dessous) et projets_club.notes existe déjà.
-- Reste à faire : RLS sur projet_budget (RLS activée mais aucune policy —
-- verrouillée, pas encore exploitable).
ALTER TABLE projet_budget ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membres_club_lecture_budget" ON projet_budget FOR SELECT USING (
  EXISTS (SELECT 1 FROM projets_club p WHERE p.id = projet_budget.projet_id
    AND (p.club_id = auth.uid() OR EXISTS (SELECT 1 FROM staff_club sc WHERE sc.club_id = p.club_id AND sc.user_id = auth.uid())))
);
CREATE POLICY "membres_club_ecriture_budget" ON projet_budget FOR ALL USING (
  EXISTS (SELECT 1 FROM projets_club p WHERE p.id = projet_budget.projet_id
    AND (p.club_id = auth.uid() OR EXISTS (SELECT 1 FROM staff_club sc WHERE sc.club_id = p.club_id AND sc.user_id = auth.uid())))
) WITH CHECK (
  EXISTS (SELECT 1 FROM projets_club p WHERE p.id = projet_budget.projet_id
    AND (p.club_id = auth.uid() OR EXISTS (SELECT 1 FROM staff_club sc WHERE sc.club_id = p.club_id AND sc.user_id = auth.uid())))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON projet_etapes, projet_budget TO authenticated;

-- Notes libres par projet — champ manquant, distinct de description/objectif.
ALTER TABLE projets_club ADD COLUMN IF NOT EXISTS notes TEXT;

-- Même trou de sécurité trouvé sur taches_projet — table réellement utilisée
-- (checklist des cartes Kanban) : une policy USING(auth.uid() IS NOT NULL)
-- coexistait avec membres_club_lecture/ecriture_taches, correctement scopées.
-- N'importe quel compte authentifié pouvait donc déjà lire/modifier les
-- tâches de n'importe quel club malgré les bonnes policies en place.
DROP POLICY IF EXISTS "taches_projet_all" ON taches_projet;
