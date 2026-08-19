-- Schéma tactique sur un procédé de la bibliothèque — même convention que
-- fiche.procedes[i].schema_png (séance d'entraînement) : un PNG (data URL,
-- export Konva stage.toDataURL()) plutôt qu'un JSON de positions à
-- réinterpréter. Réutilise directement le composant Tactipad existant
-- (mode="modal", onValider) au lieu d'un éditeur SVG dédié à reconstruire.
ALTER TABLE bibliotheque_exercices ADD COLUMN IF NOT EXISTS schema_png TEXT;
