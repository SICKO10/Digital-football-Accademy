-- Chantier saisons, bloc 5, OPTIONNEL (Inventaire, point 3) : relie une fiche de
-- fin de saison (historique_saisons) à l'équipe concernée, pour qu'un coach qui
-- a plusieurs équipes ne mélange plus ses fiches. Colonne vide par défaut :
-- aucune fiche existante n'est modifiée, aucun écran actuel n'est touché.
alter table if exists historique_saisons
  add column if not exists club_categorie_id uuid references club_categories(id) on delete set null;
