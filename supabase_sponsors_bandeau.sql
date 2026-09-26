-- Bandeau "Nos partenaires" affiché en bas des dashboards joueur/éducateur/
-- club — étend la table sponsors existante (contrats/paiements/portail
-- partenaire, cf. supabase_portail_partenaire.sql) plutôt que de créer une
-- table séparée : un sponsor "en cours de contrat" et un sponsor "affiché en
-- bandeau" sont deux facettes de la même ligne, pas deux concepts distincts.
ALTER TABLE sponsors
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS lien_url TEXT,
  ADD COLUMN IF NOT EXISTS afficher_bandeau BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ordre_bandeau INT NOT NULL DEFAULT 0;

-- Lecture du bandeau ouverte à tout utilisateur connecté (joueur ou
-- éducateur, pas seulement le staff du club concerné qui gère déjà sponsors
-- via ses policies existantes) : nom + logo d'un sponsor n'est pas une
-- donnée sensible. ATTENTION côté client : ne jamais faire select('*') avec
-- cette policy — la ligne contient aussi montant_contrat/paiements/documents
-- (réservés au staff via les policies de gestion). Toujours lister les
-- colonnes explicitement (id, entreprise, logo_url, lien_url, ordre_bandeau).
DROP POLICY IF EXISTS "sponsors_bandeau_select" ON sponsors;
CREATE POLICY "sponsors_bandeau_select" ON sponsors
  FOR SELECT TO authenticated
  USING (afficher_bandeau = true);
