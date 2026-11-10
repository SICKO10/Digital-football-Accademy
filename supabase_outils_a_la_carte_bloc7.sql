-- Outils à la carte, bloc 7 : premier paiement reçu par le webhook
-- `stripe-webhook-outils`.
--
-- À lancer APRÈS la sauvegarde (~/Sauvegardes-DigitalFootball/sauvegarder.sh),
-- dans Supabase > SQL Editor, puis lancer supabase_outils_a_la_carte_bloc7_verification.sql.
--
-- Ce que ça ajoute (rien d'existant n'est modifié) :
-- 1. `outils_stripe_evenements` : la liste des événements Stripe déjà traités.
--    Un événement livré deux fois par Stripe n'est appliqué qu'une fois.
-- 2. `outils_appliquer_abonnement` : applique un paiement en une seule
--    transaction. Soit tout passe (événement noté, outils activés, forfait du
--    club posé), soit rien du tout : l'événement n'est pas noté, Stripe le
--    relivre et on recommence proprement (même principe que
--    supabase_fix_stripe_webhook_idempotence.sql).
--
-- Seule la clé service (le webhook) peut appeler la fonction et lire la table.
-- Elle refuse un compte hors du nouveau modèle (`modele_outils` faux) : les
-- comptes actuels ne peuvent pas être touchés par ce webhook.

begin;

create table if not exists public.outils_stripe_evenements (
  evenement_id text primary key,
  type text not null,
  compte_id uuid references public.profiles(id) on delete set null,
  abonnement_id text,
  recu_le timestamptz not null default now()
);

alter table public.outils_stripe_evenements enable row level security;
revoke all on public.outils_stripe_evenements from anon, authenticated;

-- p_lignes : [{ "outil": "seances", "periodicite": "mensuel", "item": "si_..." }]
--   (outils éducateur payés, source `achat`, sans date de fin)
-- p_palier / p_periodicite : forfait club payé (c0 à c500), sinon null.
-- Rend 'ok', 'ok_autre_abonnement' (le compte avait déjà des outils payés sur
-- un autre abonnement : à vérifier dans Stripe) ou 'deja_traite'.
create or replace function public.outils_appliquer_abonnement(
  p_evenement text,
  p_type text,
  p_compte uuid,
  p_abonnement text,
  p_lignes jsonb,
  p_palier text,
  p_periodicite text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
  v_modele boolean;
  v_ligne jsonb;
  v_note text;
  v_resultat text := 'ok';
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

  if jsonb_typeof(p_lignes) is distinct from 'array' then
    raise exception 'outils: lignes invalides';
  end if;

  if jsonb_array_length(p_lignes) > 0 then
    if v_plan <> 'educateur' then
      raise exception 'outils: outils payés réservés aux éducateurs (plan %)', v_plan;
    end if;
    if exists (
      select 1 from public.outils_comptes oc
      where oc.compte_id = p_compte and oc.source = 'achat'
        and oc.stripe_subscription_id is distinct from p_abonnement
        and (oc.fin_le is null or oc.fin_le > now())
    ) then
      v_resultat := 'ok_autre_abonnement';
    end if;
    for v_ligne in select * from jsonb_array_elements(p_lignes) loop
      if coalesce(v_ligne->>'periodicite', '') not in ('mensuel', 'annuel') then
        raise exception 'outils: périodicité invalide';
      end if;
      insert into public.outils_comptes
        (compte_id, outil, source, fin_le, periodicite, stripe_subscription_id, stripe_item_id, maj_le)
      values
        (p_compte, v_ligne->>'outil', 'achat', null, v_ligne->>'periodicite', p_abonnement, v_ligne->>'item', now())
      on conflict (compte_id, outil) do update set
        source = 'achat',
        fin_le = null,
        periodicite = excluded.periodicite,
        stripe_subscription_id = excluded.stripe_subscription_id,
        stripe_item_id = excluded.stripe_item_id,
        maj_le = now();
    end loop;
  end if;

  if p_palier is not null then
    if v_plan <> 'club' then
      raise exception 'outils: forfait réservé aux clubs (plan %)', v_plan;
    end if;
    if p_palier not in ('c0', 'c100', 'c200', 'c300', 'c400', 'c500') then
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
  end if;

  if jsonb_array_length(p_lignes) = 0 and p_palier is null then
    raise exception 'outils: rien à appliquer';
  end if;

  return v_resultat;
end;
$$;

revoke all on function public.outils_appliquer_abonnement(text, text, uuid, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.outils_appliquer_abonnement(text, text, uuid, text, jsonb, text, text) to service_role;

commit;
