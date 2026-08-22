-- Le club (ou un rôle staff délégué avec can_edit sur 'terrains', président
-- toujours autorisé) n'avait aucun moyen de libérer/prendre/rendre un
-- créneau à la place d'un éducateur — ces 3 actions passaient exclusivement
-- par liberer_creneau_date/reclamer_creneau_date/annuler_reclamation_date,
-- qui ne vérifiaient que la propriété du créneau (educateur_id = auth.uid())
-- ou l'affiliation club_educateurs, jamais l'autorisation dirigeant. Corrige
-- le modèle de permissions "Terrains" : le dashboard club a tous les droits
-- sans exception sur cette page, seul le dashboard éducateur reste restreint
-- (pas de création/édition/suppression de créneau, pas d'affectation de
-- terrain à un match — déjà le cas, inchangé ici).
--
-- Vérification d'autorisation reprise telle quelle de affecter_terrain_match
-- (supabase_matchs_terrain_rpc.sql), déjà en place et fonctionnelle en
-- production — PAS de peut_gerer_terrains_club() : cette fonction est
-- définie dans supabase_planning_terrains_role_permissions.sql, qui n'a
-- jamais été appliqué à cette base (vérifié : absent de pg_proc), donc les
-- policies terrains/planning_terrains actuellement live utilisent encore la
-- règle simple club_id/staff_club sans granularité de rôle. Utiliser cette
-- fonction ici aurait cassé silencieusement les 3 RPC (function does not
-- exist) sans lien avec la demande du jour.
--
-- CREATE OR REPLACE, mêmes signatures : aucun appel front-end à changer.

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
  v_autorise boolean;
begin
  select educateur_id, club_id into v_educateur_id, v_club_id from planning_terrains where id = p_creneau_id;
  if v_club_id is null then
    raise exception 'Créneau introuvable';
  end if;

  select
    (v_educateur_id is not null and v_educateur_id = auth.uid())
    or v_club_id = auth.uid()
    or exists (
      select 1 from staff_club sc
      where sc.club_id = v_club_id and sc.user_id = auth.uid()
        and (sc.role = 'president' or exists (
          select 1 from role_permissions rp
          where rp.club_id = v_club_id and rp.role = sc.role and rp.section = 'terrains' and rp.can_edit = true
        ))
    )
  into v_autorise;

  if not v_autorise then
    raise exception 'Seul l''éducateur assigné à ce créneau (ou un dirigeant autorisé) peut le libérer ou annuler sa libération';
  end if;

  if p_liberer then
    select trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')) into v_nom from profiles where id = auth.uid();
    insert into planning_terrains_exceptions (club_id, creneau_id, date_exception, type, educateur_id, libere_par)
    values (v_club_id, p_creneau_id, p_date, 'liberation', auth.uid(), v_nom)
    on conflict (creneau_id, date_exception)
    do update set type = 'liberation', educateur_id = auth.uid(), libere_par = excluded.libere_par, equipe_remplacante = null;
  else
    delete from planning_terrains_exceptions
    where creneau_id = p_creneau_id and date_exception = p_date and type = 'liberation'
      and (educateur_id = auth.uid() or v_autorise);
  end if;
end;
$$;

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
  v_autorise boolean;
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

  select
    exists (select 1 from club_educateurs ce where ce.club_id = v_club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte')
    or v_club_id = auth.uid()
    or exists (
      select 1 from staff_club sc
      where sc.club_id = v_club_id and sc.user_id = auth.uid()
        and (sc.role = 'president' or exists (
          select 1 from role_permissions rp
          where rp.club_id = v_club_id and rp.role = sc.role and rp.section = 'terrains' and rp.can_edit = true
        ))
    )
  into v_autorise;

  if not v_autorise then
    raise exception 'Tu n''es pas affilié à ce club';
  end if;

  select trim(coalesce(cc.nom, '') || ' ' || coalesce(cc.equipe, '')) into v_equipe
  from club_categories cc where cc.club_id = v_club_id and cc.educateur_id = auth.uid() limit 1;
  -- Le dirigeant n'a pas de ligne club_categories (il n'est pas éducateur) :
  -- utilise son propre nom de profil plutôt que le "Équipe" par défaut.
  if v_equipe is null or v_equipe = '' then
    select trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')) into v_equipe from profiles where id = auth.uid();
  end if;

  update planning_terrains_exceptions
  set type = 'remplacement', educateur_id = auth.uid(), equipe_remplacante = coalesce(nullif(v_equipe, ''), 'Équipe')
  where creneau_id = p_creneau_id and date_exception = p_date;
end;
$$;

create or replace function annuler_reclamation_date(p_creneau_id uuid, p_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id uuid;
  v_autorise boolean;
begin
  select club_id into v_club_id from planning_terrains where id = p_creneau_id;
  if v_club_id is null then
    raise exception 'Créneau introuvable';
  end if;

  select
    v_club_id = auth.uid()
    or exists (
      select 1 from staff_club sc
      where sc.club_id = v_club_id and sc.user_id = auth.uid()
        and (sc.role = 'president' or exists (
          select 1 from role_permissions rp
          where rp.club_id = v_club_id and rp.role = sc.role and rp.section = 'terrains' and rp.can_edit = true
        ))
    )
  into v_autorise;

  update planning_terrains_exceptions
  set type = 'liberation', educateur_id = null, equipe_remplacante = null
  where creneau_id = p_creneau_id and date_exception = p_date and type = 'remplacement'
    and (educateur_id = auth.uid() or v_autorise);

  if not found then
    raise exception 'Tu n''as pas réclamé ce créneau (ou tu n''es pas autorisé à le rendre)';
  end if;
end;
$$;
