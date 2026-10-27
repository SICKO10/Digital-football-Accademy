-- ════════════════════════════════════════════════════════════════════
-- MODULE STAGES — Étape 2 : offres, jours, formules repas, inscriptions
-- (paiement encaissé HORS LIGNE par le club : virement, chèque, espèces)
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE. Faire une sauvegarde avant.
-- Prérequis : supabase_stages_etape1.sql + son correctif déjà appliqués.
-- Une seule transaction ; s'annule si des inscriptions existent déjà.
--
-- Principes de sécurité :
--  * les familles n'accèdent JAMAIS aux tables : l'inscription passe par
--    inscrire_stage(lien, données), qui vérifie le stage (ouvert), l'offre,
--    les jours, les places restantes JOUR PAR JOUR (verrou sur le stage :
--    pas de surréservation en cas de clics simultanés) et CALCULE le
--    montant dû — la famille ne peut ni choisir son prix ni se déclarer
--    « payé » ;
--  * les inscriptions (dont les infos de santé de mineurs) ne sont lisibles
--    que par l'équipe qui gère le stage (peut_gerer_stages).
-- ════════════════════════════════════════════════════════════════════
begin;

do $$
begin
  if exists (select 1 from public.stages_inscriptions) then
    raise exception 'Étape 2 annulée : des inscriptions existent déjà. Rien n''a été modifié.';
  end if;
end $$;

-- ── Stage : jours ouverts, modes de paiement, instructions ──────────
alter table public.stages
  add column if not exists jours date[],                       -- null = tous les jours entre début et fin
  add column if not exists modes_paiement text[] not null default array['virement', 'cheque', 'especes'],
  add column if not exists instructions_paiement text;
alter table public.stages drop constraint if exists stages_modes_paiement_valides;
alter table public.stages add constraint stages_modes_paiement_valides
  check (modes_paiement <@ array['virement', 'cheque', 'especes']::text[]);

-- Jours effectifs d'un stage (liste explicite filtrée sur la période, ou
-- tous les jours de la période si aucune liste n'est définie).
create or replace function public.stage_jours(p_debut date, p_fin date, p_jours date[])
returns date[]
language sql immutable
set search_path = public
as $$
  select case
    when p_jours is null or cardinality(p_jours) = 0
      then array(select d::date from generate_series(p_debut, p_fin, interval '1 day') d)
    else array(select distinct x from unnest(p_jours) x where x between p_debut and p_fin order by x)
  end;
$$;

-- ── Offres définies par le club ─────────────────────────────────────
-- forfait : prix total ; nb_jours = nombre exact de jours à choisir
--           (null = tous les jours du stage, ex. « Semaine complète »).
-- journee : prix PAR JOUR, nombre de jours libre.
create table if not exists public.stages_offres (
  id         uuid primary key default gen_random_uuid(),
  stage_id   uuid not null references public.stages(id) on delete cascade,
  nom        text not null,
  type       text not null check (type in ('forfait', 'journee')),
  nb_jours   int check (nb_jours is null or nb_jours > 0),
  prix       numeric(10,2) not null default 0 check (prix >= 0),
  actif      boolean not null default true,
  ordre      int not null default 0,
  created_at timestamptz not null default now(),
  check (type = 'forfait' or nb_jours is null)
);
create index if not exists idx_stages_offres_stage on public.stages_offres (stage_id);

-- ── Formules repas (prix par jour) ──────────────────────────────────
create table if not exists public.stages_formules_repas (
  id         uuid primary key default gen_random_uuid(),
  stage_id   uuid not null references public.stages(id) on delete cascade,
  nom        text not null,
  prix_jour  numeric(10,2) not null default 0 check (prix_jour >= 0),
  actif      boolean not null default true,
  ordre      int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_stages_formules_stage on public.stages_formules_repas (stage_id);

-- ── Inscriptions (table créée par la 1re version, vide) ─────────────
alter table public.stages_inscriptions
  add column if not exists offre_id           uuid references public.stages_offres(id) on delete restrict,
  add column if not exists formule_repas_id   uuid references public.stages_formules_repas(id) on delete restrict,
  add column if not exists jours              date[] not null default '{}',
  add column if not exists montant_du         numeric(10,2) not null default 0,
  add column if not exists mode_paiement      text,
  add column if not exists paye_le            date,
  add column if not exists encaisse_par       uuid references public.profiles(id),
  add column if not exists reglement_accepte  boolean not null default false,
  add column if not exists consentement_sante boolean not null default false,
  add column if not exists reference          text unique;
alter table public.stages_inscriptions alter column statut_paiement set default 'en_attente';
alter table public.stages_inscriptions alter column statut_paiement set not null;
alter table public.stages_inscriptions alter column montant_paye set default 0;
alter table public.stages_inscriptions alter column montant_paye set not null;
alter table public.stages_inscriptions drop constraint if exists stages_inscriptions_statut_valide;
alter table public.stages_inscriptions add constraint stages_inscriptions_statut_valide
  check (statut_paiement in ('en_attente', 'paye', 'annule'));
alter table public.stages_inscriptions drop constraint if exists stages_inscriptions_mode_valide;
alter table public.stages_inscriptions add constraint stages_inscriptions_mode_valide
  check (mode_paiement is null or mode_paiement in ('virement', 'cheque', 'especes'));
alter table public.stages_inscriptions drop constraint if exists stages_inscriptions_montant_valide;
alter table public.stages_inscriptions add constraint stages_inscriptions_montant_valide
  check (montant_paye >= 0 and montant_du >= 0);
create index if not exists idx_stages_inscriptions_stage on public.stages_inscriptions (stage_id);

-- ── Règles d'accès : équipe qui gère le stage uniquement ────────────
alter table public.stages_offres enable row level security;
alter table public.stages_formules_repas enable row level security;
alter table public.stages_inscriptions enable row level security;

drop policy if exists "stages_offres_gestion" on public.stages_offres;
create policy "stages_offres_gestion" on public.stages_offres
  for all to authenticated
  using (exists (select 1 from public.stages s where s.id = stage_id and public.peut_gerer_stages(s.club_id)))
  with check (exists (select 1 from public.stages s where s.id = stage_id and public.peut_gerer_stages(s.club_id)));

drop policy if exists "stages_formules_gestion" on public.stages_formules_repas;
create policy "stages_formules_gestion" on public.stages_formules_repas
  for all to authenticated
  using (exists (select 1 from public.stages s where s.id = stage_id and public.peut_gerer_stages(s.club_id)))
  with check (exists (select 1 from public.stages s where s.id = stage_id and public.peut_gerer_stages(s.club_id)));

-- Pas de policy INSERT : une inscription ne se crée que via inscrire_stage().
drop policy if exists "stages_inscriptions_lecture" on public.stages_inscriptions;
create policy "stages_inscriptions_lecture" on public.stages_inscriptions
  for select to authenticated
  using (exists (select 1 from public.stages s where s.id = stage_id and public.peut_gerer_stages(s.club_id)));
drop policy if exists "stages_inscriptions_modification" on public.stages_inscriptions;
create policy "stages_inscriptions_modification" on public.stages_inscriptions
  for update to authenticated
  using (exists (select 1 from public.stages s where s.id = stage_id and public.peut_gerer_stages(s.club_id)))
  with check (exists (select 1 from public.stages s where s.id = stage_id and public.peut_gerer_stages(s.club_id)));
drop policy if exists "stages_inscriptions_suppression" on public.stages_inscriptions;
create policy "stages_inscriptions_suppression" on public.stages_inscriptions
  for delete to authenticated
  using (exists (select 1 from public.stages s where s.id = stage_id and public.peut_gerer_stages(s.club_id)));

revoke all on public.stages_offres, public.stages_formules_repas, public.stages_inscriptions from anon;
revoke truncate, references, trigger on public.stages_offres, public.stages_formules_repas from authenticated;

-- ── Page publique : + offres, formules, jours avec places restantes ─
create or replace function public.stage_public(p_lien text)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'nom', s.nom, 'description', s.description,
    'date_debut', s.date_debut, 'date_fin', s.date_fin, 'lieu', s.lieu,
    'places_max', s.places_max, 'prix_inscription', s.prix_inscription,
    'statut', s.statut, 'reglement', s.reglement, 'liste_materiel', s.liste_materiel,
    'image_url', s.image_url,
    'modes_paiement', s.modes_paiement, 'instructions_paiement', s.instructions_paiement,
    'club_nom', p.club, 'club_couleur', p.couleur_principale, 'club_avatar', p.avatar_url,
    'planning', coalesce((
      select jsonb_agg(jsonb_build_object(
               'date', pl.date, 'heure_debut', pl.heure_debut, 'heure_fin', pl.heure_fin,
               'activite', pl.activite, 'lieu', pl.lieu, 'responsable', pl.responsable,
               'groupe', pl.groupe, 'couleur', pl.couleur)
             order by pl.date, pl.heure_debut)
      from stages_planning pl where pl.stage_id = s.id), '[]'::jsonb),
    'offres', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'nom', o.nom, 'type', o.type, 'nb_jours', o.nb_jours, 'prix', o.prix)
             order by o.ordre, o.prix)
      from stages_offres o where o.stage_id = s.id and o.actif), '[]'::jsonb),
    'formules_repas', coalesce((
      select jsonb_agg(jsonb_build_object('id', f.id, 'nom', f.nom, 'prix_jour', f.prix_jour)
             order by f.ordre, f.prix_jour)
      from stages_formules_repas f where f.stage_id = s.id and f.actif), '[]'::jsonb),
    'jours', coalesce((
      select jsonb_agg(jsonb_build_object(
               'date', j,
               'places_restantes', greatest(s.places_max - (
                 select count(*) from stages_inscriptions i
                 where i.stage_id = s.id and i.statut_paiement <> 'annule' and j = any(i.jours)), 0))
             order by j)
      from unnest(stage_jours(s.date_debut, s.date_fin, s.jours)) j), '[]'::jsonb)
  )
  from stages s
  join profiles p on p.id = s.club_id
  where s.lien_public = p_lien and s.statut <> 'brouillon';
$$;
revoke execute on function public.stage_public(text) from public;
grant execute on function public.stage_public(text) to anon, authenticated;

-- ── Inscription publique ────────────────────────────────────────────
create or replace function public.inscrire_stage(p_lien text, p jsonb)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  s           stages%rowtype;
  o           stages_offres%rowtype;
  f           stages_formules_repas%rowtype;
  v_jours     date[];
  v_jours_stage date[];
  v_n         int;
  v_jour      date;
  v_pris      int;
  v_montant   numeric(10,2);
  v_ref       text;
  v_uuid      constant text := '^[0-9a-fA-F-]{36}$';
begin
  -- Verrou sur le stage : les inscriptions simultanées passent une par une.
  select * into s from stages where lien_public = p_lien for update;
  if not found or s.statut <> 'ouvert' then
    raise exception 'Les inscriptions ne sont pas ouvertes pour ce stage.';
  end if;

  if coalesce(trim(p->>'prenom'), '') = '' or coalesce(trim(p->>'nom'), '') = ''
     or coalesce(trim(p->>'email_parent'), '') = '' or coalesce(trim(p->>'tel_parent'), '') = '' then
    raise exception 'Merci de remplir les champs obligatoires.';
  end if;
  if trim(p->>'email_parent') !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Adresse e-mail invalide.';
  end if;
  if length(p->>'prenom') > 80 or length(p->>'nom') > 80 or length(p->>'email_parent') > 200
     or length(p->>'tel_parent') > 30 or length(coalesce(p->>'club_appartenance', '')) > 120
     or length(coalesce(p->>'allergies', '')) > 1000 or length(coalesce(p->>'medicaments', '')) > 1000
     or length(coalesce(p->>'notes_medicales', '')) > 2000 then
    raise exception 'Un des champs est trop long.';
  end if;
  if coalesce(p->>'reglement_accepte', '') <> 'true' or coalesce(p->>'consentement_sante', '') <> 'true' then
    raise exception 'Merci d''accepter le règlement et le traitement des informations de santé.';
  end if;

  -- Offre
  if coalesce(p->>'offre_id', '') !~ v_uuid then raise exception 'Merci de choisir une offre.'; end if;
  select * into o from stages_offres where id = (p->>'offre_id')::uuid and stage_id = s.id and actif;
  if not found then raise exception 'Cette offre n''est plus disponible.'; end if;

  -- Formule repas (obligatoire si le club en propose)
  if exists (select 1 from stages_formules_repas where stage_id = s.id and actif) then
    if coalesce(p->>'formule_repas_id', '') !~ v_uuid then raise exception 'Merci de choisir une formule repas.'; end if;
    select * into f from stages_formules_repas where id = (p->>'formule_repas_id')::uuid and stage_id = s.id and actif;
    if not found then raise exception 'Cette formule repas n''est plus disponible.'; end if;
  end if;

  -- Jours
  v_jours_stage := stage_jours(s.date_debut, s.date_fin, s.jours);
  if o.type = 'forfait' and o.nb_jours is null then
    v_jours := v_jours_stage;
  else
    begin
      select array_agg(distinct x::date order by x::date) into v_jours
      from jsonb_array_elements_text(coalesce(p->'jours', '[]'::jsonb)) as x;
    exception when others then
      raise exception 'Jours invalides.';
    end;
    if v_jours is null then raise exception 'Merci de choisir au moins un jour.'; end if;
    if not (v_jours <@ v_jours_stage) then raise exception 'Un des jours choisis ne fait pas partie du stage.'; end if;
    if o.type = 'forfait' and cardinality(v_jours) <> o.nb_jours then
      raise exception 'Cette offre demande de choisir exactement % jour(s).', o.nb_jours;
    end if;
  end if;
  v_n := cardinality(v_jours);

  -- Places restantes, jour par jour
  foreach v_jour in array v_jours loop
    select count(*) into v_pris from stages_inscriptions i
    where i.stage_id = s.id and i.statut_paiement <> 'annule' and v_jour = any(i.jours);
    if v_pris >= s.places_max then
      raise exception 'Le % est complet.', to_char(v_jour, 'DD/MM');
    end if;
  end loop;

  -- Garde-fou contre les inscriptions en masse (fratries comprises).
  if (select count(*) from stages_inscriptions
      where stage_id = s.id and email_parent = lower(trim(p->>'email_parent'))) >= 10 then
    raise exception 'Trop d''inscriptions avec cette adresse e-mail. Contacte le club.';
  end if;

  -- Montant dû, calculé ici (jamais transmis par le navigateur)
  v_montant := (case when o.type = 'journee' then o.prix * v_n else o.prix end)
               + coalesce(f.prix_jour, 0) * v_n;
  v_ref := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into stages_inscriptions (
    stage_id, prenom, nom, date_naissance, email_parent, tel_parent, club_appartenance,
    allergies, medicaments, notes_medicales, offre_id, formule_repas_id, jours,
    montant_du, montant_paye, statut_paiement, reglement_accepte, consentement_sante, reference)
  values (
    s.id, trim(p->>'prenom'), trim(p->>'nom'), nullif(p->>'date_naissance', '')::date,
    lower(trim(p->>'email_parent')), trim(p->>'tel_parent'), nullif(trim(p->>'club_appartenance'), ''),
    nullif(trim(p->>'allergies'), ''), nullif(trim(p->>'medicaments'), ''), nullif(trim(p->>'notes_medicales'), ''),
    o.id, f.id, v_jours, v_montant, 0,
    case when v_montant = 0 then 'paye' else 'en_attente' end, true, true, v_ref);

  -- Stage « complet » quand tous ses jours sont pleins.
  if not exists (
    select 1 from unnest(v_jours_stage) j
    where (select count(*) from stages_inscriptions i
           where i.stage_id = s.id and i.statut_paiement <> 'annule' and j = any(i.jours)) < s.places_max
  ) then
    update stages set statut = 'complet' where id = s.id;
  end if;

  return jsonb_build_object('reference', v_ref, 'montant_du', v_montant, 'jours', to_jsonb(v_jours));
end;
$$;
revoke execute on function public.inscrire_stage(text, jsonb) from public;
grant execute on function public.inscrire_stage(text, jsonb) to anon, authenticated;

commit;
