-- La modale "📦 Rendu" (DashboardClub.jsx, Inventaire > Matériel) enregistre
-- la quantité réellement rendue par article lors de la validation d'une
-- remise (vs quantite = quantité distribuée), pour calculer les pertes et
-- réintégrer le bon montant dans materiel_stock.
ALTER TABLE materiel_distribution ADD COLUMN IF NOT EXISTS quantite_rendue INTEGER;
