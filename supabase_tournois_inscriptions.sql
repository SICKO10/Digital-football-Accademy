-- Inscription publique par lien (tournois organisés, Phase C). Écriture
-- ouverte à tout visiteur anonyme mais scopée à un tournoi réellement public
-- (code_public renseigné) ; lecture/gestion réservées au club organisateur
-- via is_club_manager() (créée par supabase_tournois_fix_complete.sql) —
-- même modèle que supabase_demandes_club.sql (insert public) combiné à
-- supabase_tournois_buteurs.sql (gestion club).
CREATE TABLE IF NOT EXISTS tournois_inscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournoi_id UUID NOT NULL REFERENCES tournois_organises(id) ON DELETE CASCADE,
  nom_club TEXT NOT NULL,
  categorie TEXT,
  email_referent TEXT NOT NULL,
  nom_referent TEXT,
  telephone_referent TEXT,
  mode_paiement TEXT DEFAULT 'cheque',
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'validee', 'refusee')),
  montant_du NUMERIC(8,2) DEFAULT 0,
  montant_paye NUMERIC(8,2) DEFAULT 0,
  message TEXT,
  code_confirmation TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournois_inscriptions_joueurs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inscription_id UUID NOT NULL REFERENCES tournois_inscriptions(id) ON DELETE CASCADE,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  numero_maillot INTEGER,
  email TEXT,
  date_naissance DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournois_inscriptions_tournoi ON tournois_inscriptions(tournoi_id);
CREATE INDEX IF NOT EXISTS idx_tournois_inscriptions_joueurs_inscription ON tournois_inscriptions_joueurs(inscription_id);

ALTER TABLE tournois_inscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournois_inscriptions_joueurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournois_inscriptions_public_insert" ON tournois_inscriptions
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM tournois_organises t WHERE t.id = tournoi_id AND t.code_public IS NOT NULL));
CREATE POLICY "tournois_inscriptions_manage_select" ON tournois_inscriptions
  FOR SELECT USING (EXISTS (SELECT 1 FROM tournois_organises t WHERE t.id = tournoi_id AND is_club_manager(t.club_id)));
CREATE POLICY "tournois_inscriptions_manage_update" ON tournois_inscriptions
  FOR UPDATE USING (EXISTS (SELECT 1 FROM tournois_organises t WHERE t.id = tournoi_id AND is_club_manager(t.club_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM tournois_organises t WHERE t.id = tournoi_id AND is_club_manager(t.club_id)));
CREATE POLICY "tournois_inscriptions_manage_delete" ON tournois_inscriptions
  FOR DELETE USING (EXISTS (SELECT 1 FROM tournois_organises t WHERE t.id = tournoi_id AND is_club_manager(t.club_id)));

-- Mêmes règles pour les joueurs, via l'inscription parente.
CREATE POLICY "tournois_inscriptions_joueurs_public_insert" ON tournois_inscriptions_joueurs
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM tournois_inscriptions i JOIN tournois_organises t ON t.id = i.tournoi_id WHERE i.id = inscription_id AND t.code_public IS NOT NULL));
CREATE POLICY "tournois_inscriptions_joueurs_manage_select" ON tournois_inscriptions_joueurs
  FOR SELECT USING (EXISTS (SELECT 1 FROM tournois_inscriptions i JOIN tournois_organises t ON t.id = i.tournoi_id WHERE i.id = inscription_id AND is_club_manager(t.club_id)));
CREATE POLICY "tournois_inscriptions_joueurs_manage_delete" ON tournois_inscriptions_joueurs
  FOR DELETE USING (EXISTS (SELECT 1 FROM tournois_inscriptions i JOIN tournois_organises t ON t.id = i.tournoi_id WHERE i.id = inscription_id AND is_club_manager(t.club_id)));
