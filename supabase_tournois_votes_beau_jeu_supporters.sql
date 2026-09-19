-- Complète les votes distinctions (Phase E) avec les 2 catégories manquantes
-- (plus beau jeu, supporters les plus fair-play — vote par équipe, même
-- principe que vote_fairplay_equipe_id) + ouvre la lecture publique des
-- votes pour permettre un "dévoiler les résultats" sur la page publique du
-- tournoi (jusqu'ici réservée au club via tournois_votes_manage_select).

ALTER TABLE tournois_votes
  ADD COLUMN IF NOT EXISTS vote_beau_jeu_equipe_id UUID REFERENCES tournois_equipes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vote_supporters_fairplay_equipe_id UUID REFERENCES tournois_equipes(id) ON DELETE SET NULL;

-- Lecture publique — même pattern que tournois_equipes/tournois_matchs_organises
-- public_read (code_public opaque, pas une donnée sensible). Les noms saisis
-- librement (meilleur joueur/gardien) sont déjà visibles du club uniquement
-- avant ça ; les rendre publics ici est le but explicite de la fonctionnalité
-- (dévoiler le palmarès aux parents), pas une régression de portée.
DROP POLICY IF EXISTS "tournois_votes_public_read" ON tournois_votes;
CREATE POLICY "tournois_votes_public_read" ON tournois_votes FOR SELECT
  USING (EXISTS (SELECT 1 FROM tournois_organises t WHERE t.id = tournoi_id AND t.code_public IS NOT NULL));
