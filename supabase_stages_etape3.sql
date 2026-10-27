-- ════════════════════════════════════════════════════════════════════
-- MODULE STAGES — Étape 3 : dossards automatiques + suivi de l'e-mail
-- de confirmation
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE. Faire une sauvegarde avant.
-- Prérequis : étapes 1 et 2 appliquées. Une seule transaction, additive :
-- aucune donnée existante n'est modifiée (les inscriptions déjà payées, s'il
-- y en a, reçoivent un dossard dans l'ordre de leur inscription).
-- ════════════════════════════════════════════════════════════════════
begin;

-- E-mail de confirmation : envoyé une seule fois par inscription
-- (api/stage-confirmation.js réserve l'envoi en posant cette date).
alter table public.stages_inscriptions
  add column if not exists confirmation_envoyee_le timestamptz;

-- Dossards : numéro unique par stage, attribué dans l'ordre des paiements
-- confirmés (ou à l'inscription si le montant est nul). Jamais réattribué,
-- même si l'inscription est annulée ensuite.
create unique index if not exists idx_stages_inscriptions_dossard
  on public.stages_inscriptions (stage_id, numero_dossard) where numero_dossard is not null;

create or replace function public.attribuer_dossard_stage()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.statut_paiement = 'paye' and new.numero_dossard is null then
    -- Verrou sur le stage : deux paiements validés en même temps ne
    -- peuvent pas recevoir le même numéro.
    perform 1 from stages where id = new.stage_id for update;
    select coalesce(max(numero_dossard), 0) + 1 into new.numero_dossard
    from stages_inscriptions where stage_id = new.stage_id;
  end if;
  return new;
end;
$$;
revoke execute on function public.attribuer_dossard_stage() from public, anon, authenticated;

drop trigger if exists trg_attribuer_dossard_stage on public.stages_inscriptions;
create trigger trg_attribuer_dossard_stage
  before insert or update of statut_paiement on public.stages_inscriptions
  for each row execute function public.attribuer_dossard_stage();

-- Rattrapage : inscriptions déjà payées sans dossard, par ordre d'inscription.
with a_numeroter as (
  select i.id,
         coalesce((select max(numero_dossard) from public.stages_inscriptions x where x.stage_id = i.stage_id), 0)
           + row_number() over (partition by i.stage_id order by i.created_at) as num
  from public.stages_inscriptions i
  where i.statut_paiement = 'paye' and i.numero_dossard is null
)
update public.stages_inscriptions i set numero_dossard = a.num
from a_numeroter a where a.id = i.id;

commit;
