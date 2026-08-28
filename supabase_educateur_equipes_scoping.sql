-- SUPERSEDÉ : appliqué avant de découvrir que le multi-équipes avait déjà été livré en
-- parallèle (commit e3203e8) via club_categories/club_categorie_id, pas via cette table
-- educateur_equipes. Colonnes ci-dessous inertes (nullable, jamais lues par le front) —
-- gardées pour tracer le schéma réellement présent en prod, pas pour être utilisées.
-- Voir supabase_educateur_multi_equipes.sql pour l'implémentation qui a gagné.

-- educateur_equipes existe déjà (créée hors migration trackée), et sa RLS a déjà été
-- resserrée à USING (auth.uid() = educateur_id) — vérifié en direct, rien à refaire ici.

-- Ajoute la dimension équipe aux 3 tables qui en ont réellement besoin (effectif,
-- séances, matchs). Tout le reste (presences_entrainement, stats_match, convocations,
-- disponibilites, deplacements) hérite du bon scoping via entrainement_id/match_id.
ALTER TABLE equipe_joueurs ADD COLUMN IF NOT EXISTS equipe_id UUID REFERENCES educateur_equipes(id) ON DELETE SET NULL;
ALTER TABLE entrainements  ADD COLUMN IF NOT EXISTS equipe_id UUID REFERENCES educateur_equipes(id) ON DELETE SET NULL;
ALTER TABLE matchs_equipe  ADD COLUMN IF NOT EXISTS equipe_id UUID REFERENCES educateur_equipes(id) ON DELETE SET NULL;

-- Backfill des comptes déjà présents dans educateur_equipes : chacun n'a qu'UNE seule
-- ligne à ce jour, donc rattacher leurs données existantes (equipe_id encore NULL) à
-- cette ligne est sans ambiguïté. Ne pas rejouer cette requête si un educateur_id se
-- retrouve un jour avec plusieurs lignes — la logique d'ajout d'équipe côté front gère
-- ce cas différemment (une 2e équipe démarre vide, pas de rattachement automatique).
UPDATE equipe_joueurs ej SET equipe_id = ee.id FROM educateur_equipes ee
  WHERE ee.educateur_id = ej.educateur_id AND ej.equipe_id IS NULL;
UPDATE entrainements e SET equipe_id = ee.id FROM educateur_equipes ee
  WHERE ee.educateur_id = e.educateur_id AND e.equipe_id IS NULL;
UPDATE matchs_equipe m SET equipe_id = ee.id FROM educateur_equipes ee
  WHERE ee.educateur_id = m.educateur_id AND m.equipe_id IS NULL;
