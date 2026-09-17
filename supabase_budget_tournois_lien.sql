-- Lie automatiquement le budget club aux tournois — adapté au schéma réel :
-- une seule table budget_club (type 'depense'/'recette'), pas de
-- budget_depenses/budget_recettes séparées, pas de montant_prevu/montant_reel.
-- tournois_participation a déjà budget_inscription (Phase 1, logistique) —
-- pas besoin de nouvelle colonne prix côté participation.

ALTER TABLE budget_club
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id UUID;

CREATE INDEX IF NOT EXISTS idx_budget_club_source ON budget_club(source_type, source_id);

ALTER TABLE tournois_organises
  ADD COLUMN IF NOT EXISTS prix_inscription_equipe NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nb_equipes_prevues INTEGER DEFAULT 8;
