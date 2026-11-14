-- NE PAS EXÉCUTER sans en avoir parlé avec Claude.
--
-- Retour arrière du bloc 5 (PLAN-outils-offerts-suite.md), gardé pour mémoire.
-- Remet outils_synchroniser_abonnement (supabase_outils_a_la_carte_bloc8.sql)
-- et prevenir_fin_outils_club (supabase_places_choisies.sql) comme avant, et
-- supprime les fins programmées et le registre des avis. Les avis déjà envoyés
-- restent dans la cloche des éducateurs.

begin;

drop trigger if exists trigger_avertir_fin_programmee_club on public.club_fin_programmee;
drop function if exists public.avertir_fin_programmee_club();
drop function if exists public.club_nb_educateurs_prevenus(uuid);
drop function if exists public.educateurs_prevenus_fin_club(uuid);
drop function if exists public.date_fin_texte(timestamptz);
drop table if exists public.club_fin_avis;
drop table if exists public.club_fin_programmee;

create or replace function public.outils_synchroniser_abonnement(
  p_evenement text,
  p_type text,
  p_compte uuid,
  p_abonnement text,
  p_lignes jsonb,
  p_taille integer,
  p_palier text,
  p_periodicite text,
  p_fin timestamptz,
  p_resiliation boolean,
  p_termine boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_modele boolean;
  v_note text;
  v_ligne jsonb;
  v_avant integer;
  v_baisse boolean;
  v_outils text[];
begin
  insert into public.outils_stripe_evenements (evenement_id, type, compte_id, abonnement_id)
  values (p_evenement, p_type, p_compte, p_abonnement)
  on conflict (evenement_id) do nothing
  returning evenement_id into v_note;
  if v_note is null then
    return 'deja_traite';
  end if;

  select plan, modele_outils into v_plan, v_modele
  from public.profiles where id = p_compte
  for update;
  if not found then
    raise exception 'outils: compte introuvable %', p_compte;
  end if;
  if v_modele is not true then
    raise exception 'outils: compte % hors du nouveau modèle', p_compte;
  end if;
  if p_abonnement is null or p_abonnement = '' then
    raise exception 'outils: abonnement manquant';
  end if;
  if p_fin is null then
    raise exception 'outils: date de fin manquante';
  end if;
  if jsonb_typeof(p_lignes) is distinct from 'array' then
    raise exception 'outils: lignes invalides';
  end if;

  if v_plan = 'educateur' then
    if p_palier is not null then
      raise exception 'outils: forfait réservé aux clubs';
    end if;

    if p_termine is true then
      update public.outils_comptes
      set fin_le = p_fin, maj_le = now()
      where compte_id = p_compte and source = 'achat' and stripe_subscription_id = p_abonnement
        and (fin_le is null or fin_le > p_fin);
      return 'ok';
    end if;

    if jsonb_array_length(p_lignes) = 0 then
      raise exception 'outils: rien à appliquer';
    end if;

    -- Palier payé jusqu'ici, déduit des outils de cet abonnement encore sans date de fin.
    select count(*) into v_avant
    from public.outils_comptes
    where compte_id = p_compte and source = 'achat' and stripe_subscription_id = p_abonnement and fin_le is null;
    v_baisse := p_resiliation is true
      or coalesce(p_taille, 0) < (case when v_avant = 0 then 0 when v_avant <= 3 then 3 when v_avant <= 6 then 6 else 9 end);

    select array_agg(l->>'outil') into v_outils from jsonb_array_elements(p_lignes) l;

    for v_ligne in select * from jsonb_array_elements(p_lignes) loop
      if coalesce(v_ligne->>'periodicite', '') not in ('mensuel', 'annuel') then
        raise exception 'outils: périodicité invalide';
      end if;
      insert into public.outils_comptes
        (compte_id, outil, source, fin_le, periodicite, stripe_subscription_id, stripe_item_id, maj_le)
      values
        (p_compte, v_ligne->>'outil', 'achat', case when p_resiliation is true then p_fin end,
         v_ligne->>'periodicite', p_abonnement, v_ligne->>'item', now())
      on conflict (compte_id, outil) do update set
        source = 'achat',
        fin_le = excluded.fin_le,
        periodicite = excluded.periodicite,
        stripe_subscription_id = excluded.stripe_subscription_id,
        stripe_item_id = excluded.stripe_item_id,
        maj_le = now();
    end loop;

    -- Outils retirés de cet abonnement : jusqu'à l'échéance si le prix baisse
    -- (ou si tout est résilié), sinon tout de suite.
    update public.outils_comptes
    set fin_le = case when v_baisse then p_fin else now() end, maj_le = now()
    where compte_id = p_compte and source = 'achat' and stripe_subscription_id = p_abonnement
      and fin_le is null and not (outil = any(v_outils));

    return 'ok';
  end if;

  if v_plan = 'club' then
    if jsonb_array_length(p_lignes) > 0 then
      raise exception 'outils: outils payés réservés aux éducateurs';
    end if;
    if p_termine is true then
      update public.profiles set abonnement_actif = false where id = p_compte;
      return 'ok';
    end if;
    if p_palier is null or p_palier not in ('c0', 'c100', 'c200', 'c300', 'c400', 'c500') then
      raise exception 'outils: palier inconnu %', p_palier;
    end if;
    if coalesce(p_periodicite, '') not in ('mensuel', 'annuel') then
      raise exception 'outils: périodicité invalide';
    end if;
    -- Le changement de palier recalcule le quota d'équipes (trigger_sync_quota_equipes).
    update public.profiles
    set abonnement_actif = true,
        abonnement_cycle = p_periodicite,
        palier = p_palier
    where id = p_compte;
    return 'ok';
  end if;

  raise exception 'outils: compte % (plan %) sans abonnement des outils', p_compte, v_plan;
end;
$$;

revoke all on function public.outils_synchroniser_abonnement(text, text, uuid, text, jsonb, integer, text, text, timestamptz, boolean, boolean) from public, anon, authenticated;
grant execute on function public.outils_synchroniser_abonnement(text, text, uuid, text, jsonb, integer, text, text, timestamptz, boolean, boolean) to service_role;

create or replace function public.prevenir_fin_outils_club()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_offrait boolean;
  v_offre boolean;
  v_offerts boolean;
  v_individuels boolean;
  v_perd_via boolean;
  v_date text;
begin
  begin
    -- Même règle que club_offre_outils, avant et après le changement.
    v_offrait := (old.plan = 'club' and old.modele_outils is true and old.abonnement_actif is true
      and old.palier is not null) is true;
    v_offre := (new.plan = 'club' and new.modele_outils is true and new.abonnement_actif is true
      and new.palier is not null) is true;
    -- Outils fournis sans être détenus : à tous les éducateurs, ou à certains.
    v_offerts := exists (
      select 1 from public.outils_club_ouverts o
      where o.club_id = new.id and public.outil_offert_par_club(o.outil)
    );
    v_individuels := exists (
      select 1 from public.outils_educateur_fournis e
      where e.club_id = new.id and public.outil_offert_par_club(e.outil)
    );
    -- Stages, Projet sportif, CFF4 : reçus parce que le club les détient,
    -- perdus quand son abonnement s'arrête (règle `viaClub` de outils_actifs).
    v_perd_via := old.abonnement_actif is true and new.abonnement_actif is not true and exists (
      select 1 from public.outils_club_ouverts o
      join public.outils_comptes oc on oc.compte_id = o.club_id and oc.outil = o.outil
        and (oc.fin_le is null or oc.fin_le > now())
      where o.club_id = new.id and not public.outil_offert_par_club(o.outil)
    );
    if not (v_offrait and (v_offerts or v_individuels)) and not v_perd_via then
      return null;
    end if;
    v_date := to_char(now() at time zone 'Europe/Paris', 'DD/MM');

    insert into public.notifications (user_id, type, titre, contenu, lien, lu)
    select r.educateur_id, 'outils_club_fin', 'Ton club ne fournit plus tes outils',
      case when v_offre and not v_perd_via then
        format('Ton club a changé de forfait : il n''a plus de place pour toi depuis le %s. '
          'Tu gardes le socle gratuit et tes données sont conservées. '
          'Tu peux reprendre les outils dont tu as besoin avec tes propres offres.', v_date)
      else
        format('Ton club ne fournit plus tes outils depuis le %s. Tes données sont conservées. '
          'Tu peux reprendre les outils dont tu as besoin avec tes propres offres.', v_date)
      end,
      '/educateur', false
    -- Rang de chaque éducateur accepté, places retirées exclues (même calcul
    -- que educateur_a_place).
    from public.rangs_places_club(new.id) r
    join public.profiles e on e.id = r.educateur_id and e.modele_outils is true
    where (
        v_perd_via
        or (v_offrait and r.rang <= coalesce(old.quota_equipes, 0)
            and not (v_offre and r.rang <= coalesce(new.quota_equipes, 0))
            -- Il recevait quelque chose : l'outil fourni à tous, ou un outil fourni à lui seul.
            and (v_offerts or exists (
              select 1 from public.outils_educateur_fournis f
              where f.club_id = new.id and f.educateur_id = r.educateur_id
                and public.outil_offert_par_club(f.outil)
            )))
      )
      -- Pas de doublon si plusieurs changements arrivent coup sur coup.
      and not exists (
        select 1 from public.notifications n
        where n.user_id = r.educateur_id and n.type = 'outils_club_fin' and n.lu is not true
          and n.created_at > now() - interval '1 hour'
      );
  exception when others then
    raise warning 'prevenir_fin_outils_club (club %) : %', new.id, sqlerrm;
  end;
  return null;
end;
$$;

revoke all on function public.prevenir_fin_outils_club() from public, anon, authenticated;

commit;
