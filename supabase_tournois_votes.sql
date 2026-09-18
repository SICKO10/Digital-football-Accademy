-- Votes distinctions (tournois organisés, Phase E) : chaque équipe inscrite
-- et validée vote une fois pour l'équipe fair-play, le meilleur joueur et le
-- meilleur gardien du tournoi, via un lien public /tournoi/:code/voter/:code.
CREATE TABLE IF NOT EXISTS tournois_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournoi_id UUID NOT NULL REFERENCES tournois_organises(id) ON DELETE CASCADE,
  inscription_id UUID NOT NULL REFERENCES tournois_inscriptions(id) ON DELETE CASCADE,
  vote_fairplay_equipe_id UUID REFERENCES tournois_equipes(id) ON DELETE SET NULL,
  vote_meilleur_joueur_nom TEXT,
  vote_meilleur_joueur_equipe TEXT,
  vote_meilleur_gardien_nom TEXT,
  vote_meilleur_gardien_equipe TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tournoi_id, inscription_id)
);

ALTER TABLE tournois_votes ENABLE ROW LEVEL SECURITY;

-- Vote public, mais seulement pour une inscription validée du tournoi visé
-- (la contrainte UNIQUE ci-dessus garantit 1 vote par équipe — la page de
-- vote détecte un second essai via l'erreur 23505, pas via une lecture).
CREATE POLICY "tournois_votes_public_insert" ON tournois_votes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM tournois_inscriptions i WHERE i.id = inscription_id AND i.tournoi_id = tournoi_id AND i.statut = 'validee')
  );

-- Lecture réservée au club (palmarès dans TournoiOrganise.jsx).
CREATE POLICY "tournois_votes_manage_select" ON tournois_votes
  FOR SELECT USING (EXISTS (SELECT 1 FROM tournois_organises t WHERE t.id = tournoi_id AND is_club_manager(t.club_id)));

-- La page de vote publique doit retrouver l'inscription votante à partir de
-- son code de suivi (déjà remis à l'équipe à l'inscription) — même principe
-- que code_public sur tournois_organises (supabase_tournois_organises_public_read.sql) :
-- token opaque, pas une donnée sensible en soi.
DROP POLICY IF EXISTS "tournois_inscriptions_public_read_by_code" ON tournois_inscriptions;
CREATE POLICY "tournois_inscriptions_public_read_by_code" ON tournois_inscriptions
  FOR SELECT USING (code_confirmation IS NOT NULL);

-- Suggestions "meilleur joueur" sur la page de vote = les buteurs déjà
-- enregistrés côté club (Phase B) — même pattern de lecture publique que
-- tournois_equipes/tournois_matchs_organises.
DROP POLICY IF EXISTS "tournois_buteurs_public_read" ON tournois_buteurs;
CREATE POLICY "tournois_buteurs_public_read" ON tournois_buteurs FOR SELECT
  USING (EXISTS (SELECT 1 FROM tournois_organises t WHERE t.id = tournoi_id AND t.code_public IS NOT NULL));
