-- Sections manquantes pour le mode présentation plein écran de la causerie
-- avant match (bouton "Présenter la causerie", CauserieAvantMatch.jsx).
-- Additif uniquement, même pattern que les migrations précédentes sur cette
-- table.

alter table causeries
  add column if not exists transitions jsonb default '[]',
  add column if not exists cles_du_match jsonb default '[]',
  add column if not exists premieres_minutes jsonb default '[]',
  add column if not exists message_coach text;
