-- Composition (11 titulaires + remplaçants + formation) pour une fiche de
-- causerie avant match — cf. CauserieAvantMatch.jsx. Additif sur causeries
-- (pas convocations, qui gère le programme/timeline vu par le joueur, une
-- fonctionnalité distincte).
ALTER TABLE causeries
  ADD COLUMN IF NOT EXISTS titulaires JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS remplacants JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS formation TEXT DEFAULT '4-4-2';
