-- Thème visuel personnalisé par club (couleurs, photo de fond, logo/photo
-- hero, slogan) — affiché sur DashboardClub.jsx. Pas de table `clubs` dans
-- ce projet : l'identité du club est une ligne de `profiles` (plan='club'),
-- donc les colonnes vont ici, pas sur une table qui n'existe pas.

alter table profiles
  add column if not exists couleur_principale text default '#4ade80',
  add column if not exists couleur_secondaire text default '#22d3ee',
  add column if not exists image_fond_url text,
  add column if not exists image_hero_url text,
  add column if not exists slogan text;
