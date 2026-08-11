-- Fiche de préparation avant match (outil éducateur) — cf. CauserieAvantMatch.jsx.
-- Remplace le schéma texte-généré-par-IA de la version précédente de cette
-- même table (causerie_generee/ton/enjeu en texte libre) par une fiche
-- structurée (classements, météo, listes de points, coups de pied arrêtés)
-- — pivot de fonctionnalité décidé côté produit, pas juste un ajout de
-- colonnes. Recréée de zéro plutôt qu'ALTER : la table vient d'être créée
-- dans ce même projet quelques minutes plus tôt, aucune donnée réelle n'est
-- attendue dessus. Si tu as déjà des fiches enregistrées avec l'ancien
-- formulaire (texte généré par IA) et veux les garder, dis-le avant
-- d'exécuter ce fichier — elles seraient perdues par le drop.
--
-- Outil personnel de l'éducateur (comme tactipads, prep_physique...), pas
-- une donnée partagée avec le reste du club : pas de club_id, RLS scopée
-- directement sur educateur_id = auth.uid(), même pattern que tactipads.

drop table if exists causeries;

create table causeries (
  id uuid primary key default gen_random_uuid(),
  educateur_id uuid not null references profiles(id) on delete cascade,
  equipe text,

  -- Contexte du match
  adversaire text not null,
  date_match date,
  heure_match time,
  domicile_exterieur text not null default 'domicile' check (domicile_exterieur in ('domicile', 'exterieur')),
  type_match text not null default 'championnat' check (type_match in ('championnat', 'coupe', 'amical', 'tournoi')),
  objectifs text,
  match_aller_resultat text,

  -- Classements
  notre_classement integer,
  notre_points integer,
  notre_buts_pour integer,
  notre_buts_contre integer,
  adversaire_classement integer,
  adversaire_points integer,
  adversaire_buts_pour integer,
  adversaire_buts_contre integer,

  -- Météo
  meteo text check (meteo in ('soleil', 'nuageux', 'pluie', 'vent', 'froid', 'chaud')),
  temperature integer,

  -- Tactique — tableaux de points texte
  animation_avec_ballon jsonb not null default '[]',
  animation_sans_ballon jsonb not null default '[]',

  -- Coups de pied arrêtés
  cpa_offensifs jsonb not null default '[]',
  cpa_defensifs jsonb not null default '[]',
  tireurs jsonb not null default '[]',

  created_at timestamptz not null default now()
);

alter table causeries enable row level security;

drop policy if exists "educateur_lecture_causeries" on causeries;
create policy "educateur_lecture_causeries"
  on causeries for select
  using (educateur_id = auth.uid());

drop policy if exists "educateur_ecriture_causeries" on causeries;
create policy "educateur_ecriture_causeries"
  on causeries for all
  using (educateur_id = auth.uid())
  with check (educateur_id = auth.uid());

grant select, insert, update, delete on causeries to authenticated;
