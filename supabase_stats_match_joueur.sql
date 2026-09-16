-- Suivi de stats match par match, saisi par le joueur lui-même (auto-
-- déclaratif — distinct de stats_match, alimentée par l'éducateur après un
-- match d'équipe). profil_recrutement agrège les moyennes pour préparer la
-- Phase 2 (moteur de recherche recruteur, pas encore construit) : RLS pour
-- l'instant limitée au joueur propriétaire, une policy SELECT recruteur
-- viendra s'ajouter avec ce rôle.
create table if not exists stats_match_joueur (
  id uuid primary key default gen_random_uuid(),
  joueur_id uuid references profiles(id) on delete cascade not null,
  date date not null,
  adversaire text not null,
  niveau text,
  minutes int,
  titulaire boolean default true,
  buts int default 0,
  passes_decisives int default 0,
  cartons_jaunes int default 0,
  cartons_rouges int default 0,
  passes_tentees int,
  passes_reussies int,
  recuperations int,
  duels_total int,
  duels_gagnes int,
  km_parcourus numeric,
  frappes_tentees int,
  frappes_cadrees int,
  dribbles_tentes int,
  dribbles_reussis int,
  hors_jeu int,
  interceptions int,
  tacles_reussis int,
  degagements int,
  fautes_commises int,
  arrets int,
  buts_encaisses int,
  sorties int,
  relances_reussies int,
  source text default 'manuel',
  created_at timestamptz default now()
);

alter table stats_match_joueur enable row level security;

drop policy if exists "joueur_gere_ses_stats" on stats_match_joueur;
create policy "joueur_gere_ses_stats" on stats_match_joueur for all
  using (auth.uid() = joueur_id) with check (auth.uid() = joueur_id);

create table if not exists profil_recrutement (
  joueur_id uuid primary key references profiles(id) on delete cascade,
  nb_matchs int,
  moy_minutes numeric,
  moy_buts numeric,
  moy_pd numeric,
  moy_km numeric,
  moy_recuperations numeric,
  pct_passes int,
  pct_duels int,
  pct_arrets int,
  moy_arrets numeric,
  pct_frappes int,
  pct_dribbles int,
  moy_interceptions numeric,
  moy_tacles numeric,
  updated_at timestamptz default now()
);

alter table profil_recrutement enable row level security;

drop policy if exists "joueur_gere_son_profil_recrutement" on profil_recrutement;
create policy "joueur_gere_son_profil_recrutement" on profil_recrutement for all
  using (auth.uid() = joueur_id) with check (auth.uid() = joueur_id);
