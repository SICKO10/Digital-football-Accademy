-- Nombre d'éducateurs qu'un club peut affilier gratuitement, lié à son
-- palier d'abonnement — pas encore de paliers "nombre d'équipes" figés
-- (le modèle actuel facture au nombre de licenciés, cf. STRIPE_LINKS_CLUB
-- dans stripeLinks.js), donc pas de table de correspondance en dur : ce
-- champ est réglé manuellement par le support au moment de l'activation de
-- l'abonnement (DashboardCoach.jsx), comme abonnement_actif déjà aujourd'hui.
-- NULL = aucune limite (comportement actuel inchangé pour tous les clubs
-- existants tant que le support n'a pas explicitement fixé un nombre).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS educateurs_inclus INTEGER;
