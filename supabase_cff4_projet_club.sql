-- Module "Projet Club — CFF4" (formation fédérale FFF, BMF) côté éducateur.
-- Préfixe cff4_ (et non projet_club_*) pour éviter toute confusion avec le
-- système de gestion de projets de club déjà existant (projets_club /
-- projet_etapes / etape_missions / mission_actions, sans rapport).
-- club_id (uuid, profiles) au lieu d'un nom de club en texte — convention
-- utilisée par toutes les tables liées à un club dans l'app (evenements_club,
-- materiel_stock, club_categories, annonces_club, projets_club...).

CREATE TABLE IF NOT EXISTS cff4_identite (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES profiles(id),
  educateur_id UUID NOT NULL,
  saison TEXT NOT NULL DEFAULT '2026-2027',
  valeurs TEXT[],
  slogan TEXT,
  date_creation TEXT,
  numero_affiliation TEXT,
  couleurs TEXT,
  club_omnisport BOOLEAN DEFAULT false,
  nb_licencies INTEGER,
  competition_plus_haute TEXT,
  president TEXT,
  secretaire TEXT,
  tresorier TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (club_id, saison)
);

CREATE TABLE IF NOT EXISTS cff4_diagnostic (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES profiles(id),
  educateur_id UUID NOT NULL,
  saison TEXT NOT NULL DEFAULT '2026-2027',
  -- Notes 0-5
  note_attraction INTEGER DEFAULT 0,
  note_accueil INTEGER DEFAULT 0,
  note_fidelisation INTEGER DEFAULT 0,
  note_environnement INTEGER DEFAULT 0,
  note_encadrement INTEGER DEFAULT 0,
  note_offre_pratiques INTEGER DEFAULT 0,
  note_niveau_normes INTEGER DEFAULT 0,
  note_esprit_jeu INTEGER DEFAULT 0,
  note_regles_vie INTEGER DEFAULT 0,
  note_regles_jeu INTEGER DEFAULT 0,
  -- Points+ et Points- par axe : { [axe_key]: { plus, moins } }
  details JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (club_id, saison)
);

CREATE TABLE IF NOT EXISTS cff4_objectifs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES profiles(id),
  educateur_id UUID NOT NULL,
  saison TEXT NOT NULL DEFAULT '2026-2027',
  sous_projet TEXT NOT NULL, -- 'associatif' | 'sportif' | 'educatif'
  objectif_general INTEGER NOT NULL, -- 1, 2, 3, 4
  objectif_label TEXT,
  axes TEXT[], -- jusqu'à 5 axes d'amélioration
  priorite TEXT DEFAULT 'important',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (club_id, saison, sous_projet, objectif_general)
);

CREATE TABLE IF NOT EXISTS cff4_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES profiles(id),
  educateur_id UUID NOT NULL,
  saison TEXT NOT NULL DEFAULT '2026-2027',
  sous_projet TEXT,
  objectif_general INTEGER,
  axe_amelioration TEXT,
  intitule TEXT NOT NULL,
  resume TEXT,
  date_action DATE,
  public_concerne TEXT,
  responsable TEXT,
  equipe TEXT[],
  taches JSONB DEFAULT '[]', -- [{tache, qui, quand}]
  moyens_materiels TEXT[],
  moyens_humains TEXT[],
  budget_recettes NUMERIC DEFAULT 0,
  budget_depenses NUMERIC DEFAULT 0,
  criteres_qualitatifs TEXT,
  criteres_quantitatifs TEXT,
  mois_calendrier TEXT[], -- ['sept','oct','nov'...]
  statut TEXT DEFAULT 'planifiee', -- 'planifiee' | 'en_cours' | 'realisee'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cff4_suivi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES cff4_actions(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES profiles(id),
  educateur_id UUID NOT NULL,
  avant TEXT,
  apres TEXT,
  objectifs_atteints BOOLEAN,
  raison_echec TEXT,
  budget_respecte BOOLEAN,
  points_positifs TEXT,
  points_ameliorer TEXT,
  evaluation_quantitative TEXT,
  reconductible BOOLEAN,
  conditions_reconduction TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (action_id)
);

-- RLS — données de certification personnelle de l'éducateur, pas club-wide :
-- même pattern que educateur_gere_evaluations (supabase_evaluations_joueur.sql),
-- seul l'éducateur propriétaire lit/écrit/supprime ses propres lignes.
ALTER TABLE cff4_identite ENABLE ROW LEVEL SECURITY;
ALTER TABLE cff4_diagnostic ENABLE ROW LEVEL SECURITY;
ALTER TABLE cff4_objectifs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cff4_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cff4_suivi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "educateur_gere_cff4_identite" ON cff4_identite FOR ALL
  USING (auth.uid() = educateur_id) WITH CHECK (auth.uid() = educateur_id);
CREATE POLICY "educateur_gere_cff4_diagnostic" ON cff4_diagnostic FOR ALL
  USING (auth.uid() = educateur_id) WITH CHECK (auth.uid() = educateur_id);
CREATE POLICY "educateur_gere_cff4_objectifs" ON cff4_objectifs FOR ALL
  USING (auth.uid() = educateur_id) WITH CHECK (auth.uid() = educateur_id);
CREATE POLICY "educateur_gere_cff4_actions" ON cff4_actions FOR ALL
  USING (auth.uid() = educateur_id) WITH CHECK (auth.uid() = educateur_id);
CREATE POLICY "educateur_gere_cff4_suivi" ON cff4_suivi FOR ALL
  USING (auth.uid() = educateur_id) WITH CHECK (auth.uid() = educateur_id);
