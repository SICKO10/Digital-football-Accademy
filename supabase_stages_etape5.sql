-- ════════════════════════════════════════════════════════════════════
-- MODULE STAGES — Étape 5 : tâches à plusieurs encadrants + duplication
-- d'un stage
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE. Faire une sauvegarde avant.
-- Prérequis : étapes 1 à 4 appliquées. Une seule transaction, additive :
-- les tâches existantes gardent leur encadrant (recopié dans la liste).
-- ════════════════════════════════════════════════════════════════════
begin;

-- ── Tâches : plusieurs encadrants, ou tous ──────────────────────────
alter table public.stages_taches
  add column if not exists encadrant_ids uuid[] not null default '{}',
  add column if not exists tous_encadrants boolean not null default false;

update public.stages_taches
set encadrant_ids = array[encadrant_id]
where encadrant_id is not null and cardinality(encadrant_ids) = 0;

-- Un encadrant retiré disparaît des tâches où il figurait.
create or replace function public.retirer_encadrant_des_taches()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  update stages_taches set encadrant_ids = array_remove(encadrant_ids, old.id)
  where stage_id = old.stage_id and old.id = any(encadrant_ids);
  return old;
end;
$$;
revoke execute on function public.retirer_encadrant_des_taches() from public, anon, authenticated;

drop trigger if exists trg_retirer_encadrant_des_taches on public.stages_encadrants;
create trigger trg_retirer_encadrant_des_taches
  after delete on public.stages_encadrants
  for each row execute function public.retirer_encadrant_des_taches();

-- ── Duplication d'un stage ──────────────────────────────────────────
-- Copie la préparation (offres, repas, jours, planning, encadrants,
-- matériel remis « à trouver », tâches remises « à faire », sponsors en
-- option) en décalant toutes les dates. Jamais les inscriptions ni les
-- publications. La copie démarre en brouillon avec un nouveau lien public.
-- SECURITY INVOKER : toutes les écritures passent par les règles d'accès
-- habituelles (il faut pouvoir gérer les stages du club).
create or replace function public.dupliquer_stage(p_stage_id uuid, p_nom text, p_date_debut date, p_copier_sponsors boolean default false)
returns uuid
language plpgsql security invoker
set search_path = public
as $$
declare
  s        stages%rowtype;
  v_delta  int;
  v_nouveau uuid;
  v_map    jsonb := '{}'::jsonb;
  e        record;
  v_id     uuid;
begin
  select * into s from stages where id = p_stage_id;
  if not found or not peut_gerer_stages(s.club_id) then
    raise exception 'Stage introuvable ou accès refusé.';
  end if;
  if coalesce(trim(p_nom), '') = '' or p_date_debut is null then
    raise exception 'Indique un nom et une date de début.';
  end if;
  v_delta := p_date_debut - s.date_debut;

  insert into stages (club_id, created_by, nom, description, date_debut, date_fin, lieu, places_max,
                      prix_inscription, statut, reglement, liste_materiel, image_url, jours,
                      modes_paiement, instructions_paiement)
  values (s.club_id, auth.uid(), trim(p_nom), s.description, s.date_debut + v_delta, s.date_fin + v_delta,
          s.lieu, s.places_max, s.prix_inscription, 'brouillon', s.reglement, s.liste_materiel, s.image_url,
          case when s.jours is null then null else array(select d + v_delta from unnest(s.jours) d order by 1) end,
          s.modes_paiement, s.instructions_paiement)
  returning id into v_nouveau;

  insert into stages_offres (stage_id, nom, type, nb_jours, prix, actif, ordre)
  select v_nouveau, nom, type, nb_jours, prix, actif, ordre from stages_offres where stage_id = s.id;

  insert into stages_formules_repas (stage_id, nom, prix_jour, actif, ordre)
  select v_nouveau, nom, prix_jour, actif, ordre from stages_formules_repas where stage_id = s.id;

  insert into stages_planning (stage_id, date, heure_debut, heure_fin, activite, lieu, responsable, groupe, plan_b, notes, couleur)
  select v_nouveau, date + v_delta, heure_debut, heure_fin, activite, lieu, responsable, groupe, plan_b, notes, couleur
  from stages_planning where stage_id = s.id;

  for e in select * from stages_encadrants where stage_id = s.id loop
    insert into stages_encadrants (stage_id, user_id, nom, role, telephone)
    values (v_nouveau, e.user_id, e.nom, e.role, e.telephone) returning id into v_id;
    v_map := v_map || jsonb_build_object(e.id::text, v_id::text);
  end loop;

  insert into stages_materiel (stage_id, nom, quantite, statut, encadrant_id, source, notes)
  select v_nouveau, nom, quantite, 'a_trouver', (v_map ->> encadrant_id::text)::uuid, source, notes
  from stages_materiel where stage_id = s.id;

  insert into stages_taches (stage_id, tache, categorie, date, heure_debut, heure_fin, statut, notes, encadrant_ids, tous_encadrants)
  select v_nouveau, tache, categorie, date + v_delta, heure_debut, heure_fin, 'a_faire', notes,
         coalesce(array(select (v_map ->> x::text)::uuid from unnest(encadrant_ids) x where v_map ? x::text), '{}'),
         tous_encadrants
  from stages_taches where stage_id = s.id;

  if p_copier_sponsors then
    insert into stages_sponsors (stage_id, created_by, nom, logo_url, lien_url, montant, message, actif)
    select v_nouveau, auth.uid(), nom, logo_url, lien_url, montant, message, actif
    from stages_sponsors where stage_id = s.id;
  end if;

  return v_nouveau;
end;
$$;
revoke execute on function public.dupliquer_stage(uuid, text, date, boolean) from public, anon;
grant execute on function public.dupliquer_stage(uuid, text, date, boolean) to authenticated;

commit;
