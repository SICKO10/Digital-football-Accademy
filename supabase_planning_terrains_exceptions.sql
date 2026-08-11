-- Exceptions ponctuelles au planning terrain récurrent — cf. PlanningTerrains.jsx.
-- planning_terrains reste le gabarit hebdomadaire (jour de semaine, sans
-- date) qui ne change jamais ; une exception porte sur UNE date précise
-- (libération ponctuelle, ou remplacement par une autre équipe ce jour-là)
-- et est ignorée dès que sa date est passée — le créneau de base reprend
-- automatiquement, sans purge à faire.
--
-- Remplace l'ancien mécanisme "libere/libere_par/libere_at" directement sur
-- planning_terrains (supabase_planning_terrains.sql), qui libérait le
-- créneau de façon permanente (jusqu'à re-basculement manuel) plutôt que
-- pour une occurrence précise. Ces colonnes restent en base (non
-- destructif) mais ne sont plus utilisées par l'app après ce patch.

create table if not exists planning_terrains_exceptions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references profiles(id) on delete cascade,
  creneau_id uuid not null references planning_terrains(id) on delete cascade,
  date_exception date not null,
  type text not null check (type in ('liberation', 'remplacement')) default 'liberation',
  -- educateur_id : qui a libéré (type liberation) ou réclamé (type remplacement) ce jour-là.
  educateur_id uuid references profiles(id) on delete set null,
  equipe_remplacante text,
  -- Nom affiché au moment de la libération (snapshot texte, même convention
  -- que planning_terrains.libere_par existant — pas une FK vers auth.users).
  libere_par text,
  created_at timestamptz not null default now(),
  unique (creneau_id, date_exception)
);

alter table planning_terrains_exceptions enable row level security;

-- ── Lecture : tout membre affilié au club (même règle que planning_terrains) ──
drop policy if exists "membres_club_lecture_exceptions" on planning_terrains_exceptions;
create policy "membres_club_lecture_exceptions"
  on planning_terrains_exceptions for select
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = planning_terrains_exceptions.club_id and sc.user_id = auth.uid())
    or exists (select 1 from club_educateurs ce where ce.club_id = planning_terrains_exceptions.club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte')
  );

-- ── Écriture directe : dirigeants uniquement (club lui-même + staff) — même
-- règle que planning_terrains. Les éducateurs passent par les fonctions
-- SECURITY DEFINER ci-dessous, comme pour liberer_creneau existant : RLS ne
-- permet pas de restreindre une écriture à "seulement mes propres
-- créneaux", donc la vérification se fait dans la fonction.
drop policy if exists "dirigeants_ecriture_exceptions" on planning_terrains_exceptions;
create policy "dirigeants_ecriture_exceptions"
  on planning_terrains_exceptions for all
  using (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = planning_terrains_exceptions.club_id and sc.user_id = auth.uid())
  )
  with check (
    club_id = auth.uid()
    or exists (select 1 from staff_club sc where sc.club_id = planning_terrains_exceptions.club_id and sc.user_id = auth.uid())
  );

grant select, insert, update, delete on planning_terrains_exceptions to authenticated;

-- ── Libérer/annuler la libération d'un créneau pour UNE date précise ──
create or replace function liberer_creneau_date(p_creneau_id uuid, p_date date, p_liberer boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_educateur_id uuid;
  v_club_id uuid;
  v_nom text;
begin
  select educateur_id, club_id into v_educateur_id, v_club_id from planning_terrains where id = p_creneau_id;
  if v_educateur_id is null or v_educateur_id != auth.uid() then
    raise exception 'Seul l''éducateur assigné à ce créneau peut le libérer ou annuler sa libération';
  end if;

  if p_liberer then
    select trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')) into v_nom from profiles where id = auth.uid();
    insert into planning_terrains_exceptions (club_id, creneau_id, date_exception, type, educateur_id, libere_par)
    values (v_club_id, p_creneau_id, p_date, 'liberation', auth.uid(), v_nom)
    on conflict (creneau_id, date_exception)
    do update set type = 'liberation', educateur_id = auth.uid(), libere_par = excluded.libere_par, equipe_remplacante = null;
  else
    delete from planning_terrains_exceptions
    where creneau_id = p_creneau_id and date_exception = p_date and educateur_id = auth.uid() and type = 'liberation';
  end if;
end;
$$;

grant execute on function liberer_creneau_date(uuid, date, boolean) to authenticated;

-- ── Réclamer un créneau libéré par un autre éducateur, pour cette date précise ──
create or replace function reclamer_creneau_date(p_creneau_id uuid, p_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id uuid;
  v_type text;
  v_equipe text;
begin
  select club_id into v_club_id from planning_terrains where id = p_creneau_id;
  if v_club_id is null then
    raise exception 'Créneau introuvable';
  end if;

  select type into v_type from planning_terrains_exceptions
  where creneau_id = p_creneau_id and date_exception = p_date;
  if v_type is null or v_type != 'liberation' then
    raise exception 'Ce créneau n''est plus disponible';
  end if;

  if not exists (
    select 1 from club_educateurs ce where ce.club_id = v_club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte'
  ) then
    raise exception 'Tu n''es pas affilié à ce club';
  end if;

  select trim(coalesce(cc.nom, '') || ' ' || coalesce(cc.equipe, '')) into v_equipe
  from club_categories cc where cc.club_id = v_club_id and cc.educateur_id = auth.uid() limit 1;

  update planning_terrains_exceptions
  set type = 'remplacement', educateur_id = auth.uid(), equipe_remplacante = coalesce(nullif(v_equipe, ''), 'Équipe')
  where creneau_id = p_creneau_id and date_exception = p_date;
end;
$$;

grant execute on function reclamer_creneau_date(uuid, date) to authenticated;

-- ── Realtime : diffuse les changements d'exceptions en direct, comme planning_terrains ──
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'planning_terrains_exceptions'
  ) then
    alter publication supabase_realtime add table planning_terrains_exceptions;
  end if;
end $$;
