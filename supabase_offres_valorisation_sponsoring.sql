-- CRM commercial & sponsoring — Phase 1 (suite) : catalogue d'offres à vendre
-- + valorisation du club pour l'argumentaire commercial. club_id référence
-- profiles(id), RLS calquée sur le modèle club/staff déjà utilisé
-- (cf. supabase_prospects_sponsors.sql).

create table if not exists offres_sponsoring (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references profiles(id) on delete cascade,
  nom text not null,
  categorie text not null default 'autre' check (categorie in ('maillot', 'panneau', 'digital', 'evenement', 'equipement', 'naming', 'deplacement', 'autre')),
  description text,
  prix numeric not null default 0,
  duree text not null default 'saison' check (duree in ('saison', 'annee', 'match', 'tournoi', 'stage')),
  quantite_totale integer not null default 1,
  quantite_vendue integer not null default 0,
  audience_estimee integer,
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

-- Une seule ligne par club : les chiffres clés utilisés pour bâtir le dossier
-- commercial présenté aux prospects (nombre de licenciés, audience réseaux,
-- affluence...). Mise à jour en place (upsert) plutôt qu'un historique daté —
-- ce sont des ordres de grandeur ponctuels, pas une série à suivre dans le temps.
create table if not exists club_valorisation (
  club_id uuid primary key references profiles(id) on delete cascade,
  nb_licencies integer,
  nb_familles integer,
  nb_equipes integer,
  nb_matchs_saison integer,
  affluence_moyenne integer,
  abonnes_reseaux integer,
  vues_videos_mois integer,
  frequentation_tournois integer,
  nb_affichages_physiques integer,
  repartition_geo text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_offres_sponsoring_club_id on offres_sponsoring(club_id);

alter table offres_sponsoring enable row level security;
alter table club_valorisation enable row level security;

create policy "membres_club_lecture_offres" on offres_sponsoring for select using (
  club_id = auth.uid()
  or exists (select 1 from staff_club sc where sc.club_id = offres_sponsoring.club_id and sc.user_id = auth.uid())
);
create policy "membres_club_ecriture_offres" on offres_sponsoring for all using (
  club_id = auth.uid()
  or exists (select 1 from staff_club sc where sc.club_id = offres_sponsoring.club_id and sc.user_id = auth.uid())
) with check (
  club_id = auth.uid()
  or exists (select 1 from staff_club sc where sc.club_id = offres_sponsoring.club_id and sc.user_id = auth.uid())
);

create policy "membres_club_lecture_valorisation" on club_valorisation for select using (
  club_id = auth.uid()
  or exists (select 1 from staff_club sc where sc.club_id = club_valorisation.club_id and sc.user_id = auth.uid())
);
create policy "membres_club_ecriture_valorisation" on club_valorisation for all using (
  club_id = auth.uid()
  or exists (select 1 from staff_club sc where sc.club_id = club_valorisation.club_id and sc.user_id = auth.uid())
) with check (
  club_id = auth.uid()
  or exists (select 1 from staff_club sc where sc.club_id = club_valorisation.club_id and sc.user_id = auth.uid())
);

grant select, insert, update, delete on offres_sponsoring to authenticated;
grant select, insert, update, delete on club_valorisation to authenticated;

-- Reste sous la section de permissions 'sponsors' déjà existante, comme les
-- prospects — même onglet nav, mêmes droits d'accès, pas de nouvelle entrée
-- dans role_permissions.section.
