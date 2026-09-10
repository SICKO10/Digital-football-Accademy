-- CRM commercial & sponsoring — Phase 1 : base de prospects + pipeline.
-- club_id référence profiles(id) (clubs = lignes de profiles dans cette
-- appli), RLS calquée sur le modèle club/staff déjà utilisé (cf.
-- supabase_evenements_projets_club.sql). sponsor_id est renseigné quand un
-- prospect "gagné" est converti en ligne réelle de la table sponsors
-- (déjà utilisée par GestionSponsors.jsx pour le suivi post-signature).
create table if not exists prospects_sponsors (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references profiles(id) on delete cascade,
  nom_entreprise text not null,
  secteur text,
  adresse text,
  ville text,
  contact_nom text,
  contact_fonction text,
  contact_email text,
  contact_telephone text,
  recommande_par text,
  interets text,
  equipe_interessee text,
  budget_estime numeric,
  montant_potentiel numeric,
  probabilite integer not null default 20 check (probabilite between 0 and 100),
  statut text not null default 'nouveau' check (statut in ('nouveau', 'contacte', 'proposition', 'negociation', 'gagne', 'perdu')),
  responsable text,
  prochaine_action text,
  date_relance date,
  offre_proposee text,
  motif_refus text,
  relance_saison_suivante boolean not null default false,
  sponsor_id uuid references sponsors(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Historique des échanges avec le prospect (appel, email, rdv, note libre) —
-- table à part plutôt qu'un champ texte unique, pour garder un vrai fil
-- chronologique consultable.
create table if not exists prospects_echanges (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references prospects_sponsors(id) on delete cascade,
  auteur_nom text,
  type text not null default 'note' check (type in ('appel', 'email', 'rdv', 'note')),
  contenu text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_prospects_sponsors_club_id on prospects_sponsors(club_id);
create index if not exists idx_prospects_echanges_prospect_id on prospects_echanges(prospect_id);

alter table prospects_sponsors enable row level security;
alter table prospects_echanges enable row level security;

create policy "membres_club_lecture_prospects" on prospects_sponsors for select using (
  club_id = auth.uid()
  or exists (select 1 from staff_club sc where sc.club_id = prospects_sponsors.club_id and sc.user_id = auth.uid())
);
create policy "membres_club_ecriture_prospects" on prospects_sponsors for all using (
  club_id = auth.uid()
  or exists (select 1 from staff_club sc where sc.club_id = prospects_sponsors.club_id and sc.user_id = auth.uid())
) with check (
  club_id = auth.uid()
  or exists (select 1 from staff_club sc where sc.club_id = prospects_sponsors.club_id and sc.user_id = auth.uid())
);

create policy "membres_club_lecture_echanges" on prospects_echanges for select using (
  exists (
    select 1 from prospects_sponsors p
    where p.id = prospects_echanges.prospect_id
    and (p.club_id = auth.uid() or exists (select 1 from staff_club sc where sc.club_id = p.club_id and sc.user_id = auth.uid()))
  )
);
create policy "membres_club_ecriture_echanges" on prospects_echanges for all using (
  exists (
    select 1 from prospects_sponsors p
    where p.id = prospects_echanges.prospect_id
    and (p.club_id = auth.uid() or exists (select 1 from staff_club sc where sc.club_id = p.club_id and sc.user_id = auth.uid()))
  )
) with check (
  exists (
    select 1 from prospects_sponsors p
    where p.id = prospects_echanges.prospect_id
    and (p.club_id = auth.uid() or exists (select 1 from staff_club sc where sc.club_id = p.club_id and sc.user_id = auth.uid()))
  )
);

grant select, insert, update, delete on prospects_sponsors to authenticated;
grant select, insert, update, delete on prospects_echanges to authenticated;

-- Étend la matrice de permissions (role_permissions.section) : les prospects
-- restent sous la section 'sponsors' déjà existante, pas besoin d'une
-- nouvelle entrée — même onglet nav, mêmes droits d'accès.
