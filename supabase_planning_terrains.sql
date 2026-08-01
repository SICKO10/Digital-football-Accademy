-- Terrains (surfaces) configurés par le club.
create table if not exists terrains (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references profiles(id) on delete cascade,
  nom text not null,
  type text check (type in ('foot_11', 'foot_8', '5c5', 'autre')) default 'autre',
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

-- Planning hebdomadaire d'occupation des terrains.
create table if not exists planning_terrains (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references profiles(id) on delete cascade,
  terrain_id uuid not null references terrains(id) on delete cascade,
  equipe text,
  educateur_id uuid references profiles(id) on delete set null,
  jour text not null check (jour in ('lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche')),
  heure_debut time not null,
  heure_fin time not null,
  libere boolean not null default false,
  libere_par text,
  libere_at timestamptz,
  created_at timestamptz not null default now()
);

alter table terrains enable row level security;
alter table planning_terrains enable row level security;

-- ── Lecture : tout membre affilié au club (club lui-même, staff, éducateurs acceptés) ──
create policy "membres_club_lecture_terrains"
  on terrains for select
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = terrains.club_id and sc.user_id = auth.uid())
    or exists (select 1 from club_educateurs ce where ce.club_id = terrains.club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte')
  );

create policy "membres_club_lecture_planning"
  on planning_terrains for select
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = planning_terrains.club_id and sc.user_id = auth.uid())
    or exists (select 1 from club_educateurs ce where ce.club_id = planning_terrains.club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte')
  );

-- ── Écriture (config terrains + créneaux) : dirigeants uniquement (club lui-même + staff) ──
create policy "dirigeants_insertion_terrains"
  on terrains for insert
  with check (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = terrains.club_id and sc.user_id = auth.uid())
  );

create policy "dirigeants_maj_terrains"
  on terrains for update
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = terrains.club_id and sc.user_id = auth.uid())
  );

create policy "dirigeants_suppression_terrains"
  on terrains for delete
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = terrains.club_id and sc.user_id = auth.uid())
  );

create policy "dirigeants_insertion_planning"
  on planning_terrains for insert
  with check (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = planning_terrains.club_id and sc.user_id = auth.uid())
  );

create policy "dirigeants_maj_planning"
  on planning_terrains for update
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = planning_terrains.club_id and sc.user_id = auth.uid())
  );

create policy "dirigeants_suppression_planning"
  on planning_terrains for delete
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = planning_terrains.club_id and sc.user_id = auth.uid())
  );

grant select, insert, update, delete on terrains to authenticated;
grant select, insert, update, delete on planning_terrains to authenticated;

-- ── Libération d'un créneau par l'éducateur concerné uniquement ──
-- RLS ne permet pas de restreindre une UPDATE à certaines colonnes seulement
-- (une policy s'applique à la ligne entière) : on passe donc par une fonction
-- SECURITY DEFINER qui vérifie explicitement educateur_id = auth.uid() et ne
-- touche jamais qu'aux 3 colonnes libere/libere_par/libere_at, jamais à
-- equipe/educateur_id/horaires. Aucune policy UPDATE n'est donc ouverte aux
-- éducateurs sur cette table — seule cette fonction leur permet d'écrire.
create or replace function liberer_creneau(p_creneau_id uuid, p_libere boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_educateur_id uuid;
  v_nom text;
begin
  select educateur_id into v_educateur_id from planning_terrains where id = p_creneau_id;
  if v_educateur_id is null or v_educateur_id != auth.uid() then
    raise exception 'Seul l''éducateur assigné à ce créneau peut le libérer ou annuler sa libération';
  end if;

  if p_libere then
    select trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')) into v_nom from profiles where id = auth.uid();
    update planning_terrains set libere = true, libere_par = v_nom, libere_at = now() where id = p_creneau_id;
  else
    update planning_terrains set libere = false, libere_par = null, libere_at = null where id = p_creneau_id;
  end if;
end;
$$;

grant execute on function liberer_creneau(uuid, boolean) to authenticated;

-- ── Realtime : diffuse les changements de planning_terrains en direct ──
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'planning_terrains'
  ) then
    alter publication supabase_realtime add table planning_terrains;
  end if;
end $$;
