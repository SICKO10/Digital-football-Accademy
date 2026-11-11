-- Budget prévisionnel du club (s'ajoute au journal existant budget_club, qui
-- n'est PAS touché : les tournois continuent d'y écrire).
--
-- SCRIPT NON APPLIQUÉ. À lancer par Kevin dans le SQL Editor, après la
-- sauvegarde ~/Sauvegardes-DigitalFootball/sauvegarder.sh.
-- N'ajoute que de nouvelles tables : aucune donnée existante n'est modifiée.
--
-- Tables :
--   budget_modeles : bibliothèque commune (lecture seule, SANS aucun prix)
--   budgets        : un budget par club et par saison
--   budget_lignes  : les lignes de dépenses et de recettes
--
-- Règle de calcul (appliquée côté application) :
--   total annuel d'une ligne = quantité x prix unitaire x facteur
--   facteur = nb_mois_activite si periodicite = 'mois', sinon 1
--   ('match' : la quantité est le nombre de matchs, étalés sur les mois d'activité ;
--    'an' et 'saison' : un seul paiement, dans mois_paiement)
--
-- Accès : mêmes droits que l'onglet Budget actuel.
--   le club lui-même ; le président ; un autre rôle du staff seulement si
--   role_permissions lui donne la section 'budget' (voir), et can_edit (modifier) ;
--   sans réglage explicite : président et secrétaire (cf. src/lib/permissionsClub.js).

-- ── Fonction d'accès, utilisée par toutes les policies ─────────────────────
CREATE OR REPLACE FUNCTION peut_acceder_budget(p_club uuid, p_ecriture boolean)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_club = auth.uid()
    OR EXISTS (
      SELECT 1 FROM staff_club sc
      WHERE sc.club_id = p_club AND sc.user_id = auth.uid()
        AND (
          sc.role = 'president'
          OR CASE
               WHEN EXISTS (SELECT 1 FROM role_permissions rp
                            WHERE rp.club_id = p_club AND rp.role = sc.role AND rp.section = 'budget')
               THEN EXISTS (SELECT 1 FROM role_permissions rp
                            WHERE rp.club_id = p_club AND rp.role = sc.role AND rp.section = 'budget'
                              AND rp.can_view AND (NOT p_ecriture OR rp.can_edit))
               ELSE sc.role = 'secretaire'
             END
        )
    )
$$;

-- ── Bibliothèque de modèles (commune, lecture seule) ───────────────────────
CREATE TABLE IF NOT EXISTS budget_modeles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('depense', 'recette')),
  categorie TEXT NOT NULL,
  libelle TEXT NOT NULL,
  unite TEXT NOT NULL CHECK (unite IN ('mois', 'an', 'match', 'saison')),
  ordre INTEGER NOT NULL DEFAULT 0,
  UNIQUE (type, libelle)
);

ALTER TABLE budget_modeles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "budget_modeles_lecture" ON budget_modeles;
CREATE POLICY "budget_modeles_lecture" ON budget_modeles FOR SELECT TO authenticated USING (true);
-- Aucune policy d'écriture : seuls les scripts SQL (service role) modifient les modèles.

-- ── Budget par club et par saison ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  saison TEXT NOT NULL,                       -- ex. '2026-2027'
  nb_mois_activite INTEGER NOT NULL DEFAULT 10 CHECK (nb_mois_activite BETWEEN 1 AND 12),
  effectifs_prevus JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { "<club_categories.id>": nb joueurs prévus }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (club_id, saison)
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "budgets_lecture" ON budgets;
DROP POLICY IF EXISTS "budgets_ecriture" ON budgets;
CREATE POLICY "budgets_lecture" ON budgets FOR SELECT TO authenticated
  USING (peut_acceder_budget(club_id, false));
CREATE POLICY "budgets_ecriture" ON budgets FOR ALL TO authenticated
  USING (peut_acceder_budget(club_id, true))
  WITH CHECK (peut_acceder_budget(club_id, true));

-- ── Lignes de budget ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budget_lignes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  equipe_id UUID REFERENCES club_categories(id) ON DELETE CASCADE,  -- NULL = charge commune du club
  type TEXT NOT NULL CHECK (type IN ('depense', 'recette')),
  categorie TEXT NOT NULL,
  libelle TEXT NOT NULL,
  quantite NUMERIC NOT NULL DEFAULT 1 CHECK (quantite >= 0),
  prix_unitaire NUMERIC,                      -- NULL = « à renseigner », jamais de prix inventé
  periodicite TEXT NOT NULL CHECK (periodicite IN ('mois', 'an', 'match', 'saison')),
  mois_paiement INTEGER CHECK (mois_paiement BETWEEN 1 AND 12),
  modele_id UUID REFERENCES budget_modeles(id) ON DELETE SET NULL,
  est_personnalisee BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_lignes_budget ON budget_lignes (budget_id);
CREATE INDEX IF NOT EXISTS idx_budgets_club ON budgets (club_id);

ALTER TABLE budget_lignes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "budget_lignes_lecture" ON budget_lignes;
DROP POLICY IF EXISTS "budget_lignes_ecriture" ON budget_lignes;
CREATE POLICY "budget_lignes_lecture" ON budget_lignes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_lignes.budget_id AND peut_acceder_budget(b.club_id, false)));
-- L'équipe d'une ligne doit appartenir au même club que le budget.
CREATE POLICY "budget_lignes_ecriture" ON budget_lignes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_lignes.budget_id AND peut_acceder_budget(b.club_id, true)))
  WITH CHECK (
    EXISTS (SELECT 1 FROM budgets b WHERE b.id = budget_lignes.budget_id AND peut_acceder_budget(b.club_id, true)
      AND (budget_lignes.equipe_id IS NULL
           OR EXISTS (SELECT 1 FROM club_categories c WHERE c.id = budget_lignes.equipe_id AND c.club_id = b.club_id)))
  );

-- ── Modèles pré-remplis (libellés, catégories, unités : AUCUN prix) ────────
INSERT INTO budget_modeles (type, categorie, libelle, unite, ordre) VALUES
  -- Dépenses : encadrement
  ('depense', 'Encadrement', 'Éducateur (rémunération brute chargée)', 'mois', 10),
  ('depense', 'Encadrement', 'Indemnités et défraiements', 'mois', 11),
  ('depense', 'Encadrement', 'Formation éducateur (BMF / BEF)', 'an', 12),
  -- Équipements
  ('depense', 'Équipements', 'Jeu de maillots', 'an', 20),
  ('depense', 'Équipements', 'Ballons et petit matériel', 'an', 21),
  ('depense', 'Équipements', 'Trousse médicale', 'an', 22),
  -- Compétition
  ('depense', 'Compétition', 'Licences et affiliation', 'an', 30),
  ('depense', 'Compétition', 'Arbitrage et frais de district', 'an', 31),
  -- Déplacements
  ('depense', 'Déplacements', 'Bus ou minibus', 'match', 40),
  ('depense', 'Déplacements', 'Carburant et indemnités kilométriques', 'match', 41),
  -- Installations
  ('depense', 'Installations', 'Location de terrain et de salles', 'mois', 50),
  ('depense', 'Installations', 'Entretien des installations', 'an', 51),
  -- Structure
  ('depense', 'Structure du club', 'Assurance', 'an', 60),
  ('depense', 'Structure du club', 'Frais administratifs', 'an', 61),
  ('depense', 'Structure du club', 'Comptabilité', 'an', 62),
  -- Médical
  ('depense', 'Médical', 'Kinésithérapeute', 'mois', 70),
  ('depense', 'Médical', 'Soins', 'an', 71),
  ('depense', 'Médical', 'Défibrillateur', 'an', 72),
  -- Événements
  ('depense', 'Événements', 'Stages', 'saison', 80),
  ('depense', 'Événements', 'Tournois', 'saison', 81),
  ('depense', 'Événements', 'Fête de fin de saison', 'saison', 82),
  -- Recettes
  ('recette', 'Cotisations', 'Cotisations des joueurs (quantité = nombre de joueurs)', 'an', 100),
  ('recette', 'Subventions', 'Subvention municipale', 'an', 110),
  ('recette', 'Subventions', 'Subvention départementale', 'an', 111),
  ('recette', 'Subventions', 'Subvention régionale', 'an', 112),
  ('recette', 'Sponsoring', 'Sponsoring et partenaires', 'an', 120),
  ('recette', 'Événements', 'Stages et tournois', 'saison', 130),
  ('recette', 'Buvette et billetterie', 'Buvette', 'match', 140),
  ('recette', 'Buvette et billetterie', 'Billetterie', 'match', 141),
  ('recette', 'Boutique', 'Ventes de matériel et boutique', 'an', 150)
ON CONFLICT (type, libelle) DO NOTHING;
