-- Le schéma tactique d'un procédé de bibliothèque n'était sauvegardé que sous
-- forme de PNG plat (schema_png) — rouvrir "Modifier le schéma" repartait
-- donc toujours d'un plateau vide, le PNG ne pouvant pas être redécomposé en
-- éléments éditables. schema_data porte la structure complète du Tactipad
-- ({ terrain, elements, sequences, equipesCouleurs }, cf. Tactipad.jsx
-- sauvegarderSchema/validerSchema) pour permettre de recharger l'éditeur.

alter table bibliotheque_exercices add column if not exists schema_data jsonb;
