-- Phase 3 — lecture publique via code_public (page /tournoi/:code, sans
-- connexion). Politique SELECT additionnelle : les policies "_manage"
-- existantes (is_club_manager) restent pour la gestion complète côté club,
-- Postgres combine les policies permissives d'une même commande en OR — donc
-- ceci ajoute juste un accès lecture seule public, sans toucher à l'écriture.
-- Même pattern que acces_token (PartenairePublic) : le code_public est un
-- token opaque généré aléatoirement (36 caractères, non séquentiel), pas une
-- donnée sensible en soi.

DROP POLICY IF EXISTS "tournois_organises_public_read" ON tournois_organises;
CREATE POLICY "tournois_organises_public_read" ON tournois_organises FOR SELECT
  USING (code_public IS NOT NULL);

DROP POLICY IF EXISTS "tournois_equipes_public_read" ON tournois_equipes;
CREATE POLICY "tournois_equipes_public_read" ON tournois_equipes FOR SELECT
  USING (EXISTS (SELECT 1 FROM tournois_organises t WHERE t.id = tournoi_id AND t.code_public IS NOT NULL));

DROP POLICY IF EXISTS "tournois_matchs_organises_public_read" ON tournois_matchs_organises;
CREATE POLICY "tournois_matchs_organises_public_read" ON tournois_matchs_organises FOR SELECT
  USING (EXISTS (SELECT 1 FROM tournois_organises t WHERE t.id = tournoi_id AND t.code_public IS NOT NULL));
