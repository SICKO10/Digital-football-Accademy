-- Outils à la carte, bloc 8 : changements d'abonnement reçus par le webhook
-- `stripe-webhook-outils` (outils changés, palier ou forfait changé,
-- résiliation prévue ou annulée, fin d'abonnement).
--
-- À lancer APRÈS la sauvegarde (~/Sauvegardes-DigitalFootball/sauvegarder.sh),
-- dans Supabase > SQL Editor, puis lancer supabase_outils_a_la_carte_bloc8_verification.sql.
--
-- Ce que ça ajoute (rien d'existant n'est modifié) : la fonction
-- `outils_synchroniser_abonnement`, qui remet la base à l'état de
-- l'abonnement relu chez Stripe, en une seule transaction (tout ou rien, et
-- un événement déjà traité n'est pas appliqué deux fois : même registre
-- `outils_stripe_evenements` qu'au bloc 7).
--
-- Règles appliquées à l'éducateur (décisions de Kevin du 2026-11-11) :
-- - outil ajouté : actif tout de suite ;
-- - outil retiré en descendant de palier, ou abonnement résilié : actif
--   jusqu'à la fin de la période déjà payée (fin_le), sans remboursement ;
-- - outil remplacé sans descendre de palier : arrêté tout de suite (sa place
--   est reprise par le nouvel outil) ;
-- - abonnement terminé : tous ses outils s'arrêtent à la date de fin.
-- Club : le forfait (palier, quota d'équipes) suit Stripe ; abonnement terminé
-- = accès limité (abonnement_actif faux), comme un club qui n'a pas payé.
-- Les données ne sont jamais effacées.
--
-- Seule la clé service (le webhook) peut appeler la fonction. Elle refuse un
-- compte hors du nouveau modèle (`modele_outils` faux).

begin;

-- p_lignes : outils éducateur payés [{ "outil", "periodicite", "item" }] (vide pour un club)
-- p_taille : nombre d'outils payés par l'éducateur (3, 6 ou 9)
-- p_palier / p_periodicite : forfait du club (c0 à c500), sinon null
-- p_fin : fin de la période payée (date de fin réelle si p_termine)
-- p_resiliation : l'abonnement s'arrête à p_fin ; p_termine : il est terminé
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

commit;
