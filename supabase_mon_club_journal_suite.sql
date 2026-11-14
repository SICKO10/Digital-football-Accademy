-- Chantier « le club offre les outils », suite, bloc 3 (PLAN-outils-offerts-suite.md) :
-- le journal de Mon club accepte les outils fournis et les places.
-- Additif : la table, ses règles d'accès et ses lignes existantes ne changent pas.
--
-- Nouvelles actions (colonne action) :
--   fourni         outil fourni par le club (à tous, ou à un seul éducateur)
--   plus_fourni    outil que le club ne fournit plus
--   place_donnee   place garantie donnée à un éducateur
--   place_retiree  place retirée à un éducateur
--   place_auto     place remise en automatique (le choix du club est effacé)
-- Pour une place, `outil` reste vide et `etat_avant` garde ce qu'il y avait
-- avant le changement (choisi, retire, auto) : « Rétablir » remet exactement cet état.
-- Les lignes déjà écrites (retire, reaffiche) restent telles quelles.
--
-- Prérequis : supabase_mon_club_journal.sql. Le script s'arrête sans rien
-- modifier s'il manque quelque chose ou s'il a déjà été lancé.
--
-- Exécution : lancer d'abord ~/Sauvegardes-DigitalFootball/sauvegarder.sh, puis
-- ce fichier en entier, puis supabase_mon_club_journal_suite_verification.sql.

begin;

-- ── 0. Garde-fous ───────────────────────────────────────────────────────────

do $$
begin
  if to_regclass('public.mon_club_journal') is null then
    raise exception 'ARRÊT : supabase_mon_club_journal.sql n''a pas été exécuté. Rien n''a été modifié.';
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'mon_club_journal' and column_name = 'etat_avant') then
    raise exception 'ARRÊT : le journal accepte déjà les places (script déjà exécuté ?). Rien n''a été modifié.';
  end if;
  if not exists (select 1 from pg_constraint
                 where conrelid = 'public.mon_club_journal'::regclass and conname = 'mon_club_journal_action_check') then
    raise exception 'ARRÊT : la règle sur les actions du journal n''a pas le nom attendu. Rien n''a été modifié.';
  end if;
end;
$$;

-- ── 1. Nouvelles actions ────────────────────────────────────────────────────

alter table public.mon_club_journal drop constraint mon_club_journal_action_check;
alter table public.mon_club_journal add constraint mon_club_journal_action_check
  check (action in ('retire', 'reaffiche', 'fourni', 'plus_fourni', 'place_donnee', 'place_retiree', 'place_auto'));

-- ── 2. Les places n'ont pas d'outil, elles gardent l'état d'avant ───────────

alter table public.mon_club_journal alter column outil drop not null;
alter table public.mon_club_journal add column etat_avant text
  check (etat_avant in ('choisi', 'retire', 'auto'));

-- Une ligne de place : pas d'outil, un état d'avant. Une ligne d'outil : un outil, pas d'état.
alter table public.mon_club_journal add constraint mon_club_journal_objet_selon_action
  check (
    (action like 'place\_%' and outil is null and etat_avant is not null)
    or (action not like 'place\_%' and outil is not null and etat_avant is null)
  );

commit;
