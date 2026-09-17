-- Classification "type de procédé" pour la bibliothèque vidéo (Échauffement/
-- Exercice/Situation/Jeu) — même vocabulaire que le champ `type` de
-- bibliotheque_exercices (procédés/drills), pour rester cohérent entre les
-- deux bibliothèques. Optionnel : toutes les vidéos ne représentent pas un
-- contenu de terrain classable ainsi.
ALTER TABLE bibliotheque_videos
ADD COLUMN IF NOT EXISTS type_procede TEXT;
