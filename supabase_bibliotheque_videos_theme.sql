-- Classification par thème/type de séance, réservée au contenu 'df'
-- (Digital Football) — cf. src/components/BibliothequeVideos.jsx.
ALTER TABLE bibliotheque_videos
  ADD COLUMN IF NOT EXISTS theme_seance TEXT,
  ADD COLUMN IF NOT EXISTS type_seance TEXT;

ALTER TABLE bibliotheque_videos DROP CONSTRAINT IF EXISTS bibliotheque_videos_type_seance_check;
ALTER TABLE bibliotheque_videos ADD CONSTRAINT bibliotheque_videos_type_seance_check
  CHECK (type_seance IS NULL OR type_seance IN ('collectif', 'individuel', 'les_deux'));
-- theme_seance : 'pressing' | 'transition' | 'jeu_position' | 'corner' |
-- 'coup_franc' | 'gardien' | 'physique' | 'technique_individuelle' | 'autre'
-- — laissé en texte libre comme `categorie`, pas de CHECK contraignant.
