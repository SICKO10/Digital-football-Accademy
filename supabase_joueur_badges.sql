-- Badges de palmarès par joueur et par saison (Phase F), déclenchés depuis
-- la liaison compte↔inscription tournoi (LierTournoi.jsx) et depuis la
-- validation du match de finale (TournoiOrganise.jsx). joueur_id référence
-- profiles(id), pas auth.users(id) — convention réelle de ce projet pour
-- les données liées à un profil joueur (cf. tournois_participation,
-- certifications, convocations, disponibilites, candidatures).
CREATE TABLE IF NOT EXISTS joueur_badges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  joueur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  saison TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('tournoi_participation','tournoi_victoire','meilleur_buteur','meilleur_joueur','meilleur_gardien','fair_play','champion','coupe')),
  label TEXT NOT NULL,
  sous_label TEXT,
  competition TEXT,
  club TEXT,
  categorie TEXT,
  couleur TEXT DEFAULT '#4ade80',
  icone TEXT DEFAULT '🏆',
  source_type TEXT,
  source_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lien entre un joueur inscrit à un tournoi (formulaire public, Phase C) et
-- son compte Digital Football — permet d'attribuer les badges au bon
-- joueur_id une fois qu'il s'est identifié.
CREATE TABLE IF NOT EXISTS tournois_joueurs_comptes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournoi_id UUID NOT NULL REFERENCES tournois_organises(id) ON DELETE CASCADE,
  inscription_id UUID NOT NULL REFERENCES tournois_inscriptions(id) ON DELETE CASCADE,
  joueur_inscription_id UUID NOT NULL REFERENCES tournois_inscriptions_joueurs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verifie BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tournoi_id, joueur_inscription_id)
);

CREATE INDEX IF NOT EXISTS idx_joueur_badges_joueur ON joueur_badges(joueur_id);
CREATE INDEX IF NOT EXISTS idx_tournois_joueurs_comptes_tournoi ON tournois_joueurs_comptes(tournoi_id);

ALTER TABLE joueur_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournois_joueurs_comptes ENABLE ROW LEVEL SECURITY;

-- Un joueur ne peut voir/insérer que ses propres badges — la légitimité du
-- contenu (a-t-il vraiment gagné) n'est pas vérifiée côté serveur dans
-- cette V1 (attribution côté client, décision produit assumée), mais un
-- joueur ne peut pas forger un badge pour un autre compte.
CREATE POLICY "joueur_badges_select_self" ON joueur_badges FOR SELECT USING (joueur_id = auth.uid());
CREATE POLICY "joueur_badges_insert_self" ON joueur_badges FOR INSERT WITH CHECK (joueur_id = auth.uid());

-- tournois_joueurs_comptes : écriture publique scopée à un joueur réellement
-- listé dans une inscription validée du tournoi visé (même garde-fou que
-- tournois_votes_public_insert) ; lecture/maj limitées au compte lié ou au
-- club organisateur (is_club_manager, créée par supabase_tournois_fix_complete.sql).
CREATE POLICY "tournois_joueurs_comptes_public_insert" ON tournois_joueurs_comptes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM tournois_inscriptions_joueurs j WHERE j.id = joueur_inscription_id AND j.inscription_id = inscription_id)
    AND EXISTS (SELECT 1 FROM tournois_inscriptions i WHERE i.id = inscription_id AND i.tournoi_id = tournoi_id AND i.statut = 'validee')
  );
CREATE POLICY "tournois_joueurs_comptes_update_self" ON tournois_joueurs_comptes
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "tournois_joueurs_comptes_select" ON tournois_joueurs_comptes
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM tournois_organises t WHERE t.id = tournoi_id AND is_club_manager(t.club_id))
  );

-- La page de liaison compte↔tournoi (LierTournoi.jsx) doit retrouver un
-- joueur inscrit à partir de son prénom/nom — contrairement au code de suivi
-- d'une inscription (token opaque, cf. tournois_inscriptions_public_read_by_code),
-- un prénom/nom n'est pas un secret : rendre toute la table
-- tournois_inscriptions_joueurs lisible publiquement exposerait la date de
-- naissance et l'email de tous les joueurs de tous les tournois. Une
-- fonction SECURITY DEFINER fait la recherche côté serveur et ne renvoie que
-- le strict nécessaire (pas date_naissance/email) — même famille de pattern
-- que is_club_manager()/get_sponsor_by_token pour ce type de besoin.
CREATE OR REPLACE FUNCTION trouver_joueur_inscrit_tournoi(p_code_public TEXT, p_prenom TEXT, p_nom TEXT)
RETURNS TABLE (id UUID, inscription_id UUID, prenom TEXT, nom TEXT, numero_maillot INTEGER, nom_club TEXT)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT j.id, j.inscription_id, j.prenom, j.nom, j.numero_maillot, i.nom_club
  FROM tournois_inscriptions_joueurs j
  JOIN tournois_inscriptions i ON i.id = j.inscription_id
  JOIN tournois_organises t ON t.id = i.tournoi_id
  WHERE t.code_public = upper(p_code_public)
    AND i.statut = 'validee'
    AND lower(trim(j.prenom)) = lower(trim(p_prenom))
    AND lower(trim(j.nom)) = lower(trim(p_nom))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION trouver_joueur_inscrit_tournoi(TEXT, TEXT, TEXT) TO anon, authenticated;

-- Lecture publique des votes (nécessaire pour que LierTournoi.jsx calcule
-- si le joueur a gagné une distinction votée) — même pattern que
-- tournois_buteurs_public_read (supabase_tournois_votes.sql) : opinion peu
-- sensible, pas de donnée personnelle au-delà de noms déjà publics ailleurs
-- (buteurs, équipes).
DROP POLICY IF EXISTS "tournois_votes_public_read" ON tournois_votes;
CREATE POLICY "tournois_votes_public_read" ON tournois_votes FOR SELECT
  USING (EXISTS (SELECT 1 FROM tournois_organises t WHERE t.id = tournoi_id AND t.code_public IS NOT NULL));
