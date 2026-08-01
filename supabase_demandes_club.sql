-- Demandes de contact club depuis la page publique /offres — remplace le
-- paiement Stripe en libre-service pour le club (vente humaine, B2B, contrats
-- à 50-250€/mois). Le formulaire est rempli par des visiteurs non connectés,
-- d'où la policy INSERT ouverte ci-dessous.
CREATE TABLE IF NOT EXISTS demandes_club (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  role TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  message TEXT,
  statut TEXT NOT NULL DEFAULT 'nouveau' CHECK (statut IN ('nouveau', 'traite'))
);

ALTER TABLE demandes_club ENABLE ROW LEVEL SECURITY;

-- N'importe qui (visiteur non connecté inclus) peut soumettre une demande.
CREATE POLICY "public_insert_demande_club" ON demandes_club
  FOR INSERT WITH CHECK (true);

-- Lecture/traitement : même modèle que le reste de l'app (pas de filtrage
-- strict par plan/email au niveau RLS — l'accès à l'UI "Demandes Club" est
-- filtré côté front par COACH_ADMIN_EMAILS, cf. lib/coachAdmin.js).
CREATE POLICY "lecture_authentifie_demande_club" ON demandes_club
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "update_authentifie_demande_club" ON demandes_club
  FOR UPDATE USING (auth.role() = 'authenticated');
