-- Chantier Mon club, bloc 10 (PLAN-mon-club.md) : journal des changements du
-- menu des éducateurs. Additif uniquement : une nouvelle table, aucune table ni
-- règle existante n'est modifiée, aucune ligne n'est créée.
--
-- Une ligne = un outil retiré ou réaffiché dans le menu d'un ou plusieurs
-- éducateurs, tel que la base le confirme (un changement annulé dans les
-- secondes du bandeau « Annuler » n'y apparaît jamais).
--
-- Règles retenues :
--   - Écriture par le serveur seulement (api/outils.js, action prevenir_menu,
--     clé de service) : aucun droit d'écriture pour le navigateur, l'auteur et
--     la date ne peuvent donc pas être falsifiés.
--   - Lecture par le club et ceux qui peuvent modifier Mon club (compte club,
--     président, rôle ayant « Mon club » dans la matrice). Les éducateurs ne
--     lisent pas le journal.
--   - Rien n'est modifié ni supprimé par l'appli : « Rétablir » ajoute une
--     nouvelle ligne (retablit_id pointe vers la ligne d'origine).
--
-- Prérequis : supabase_mon_club.sql (fonction mon_club_peut_modifier). Le script
-- s'arrête sans rien modifier s'il manque quelque chose.
--
-- Exécution : lancer d'abord ~/Sauvegardes-DigitalFootball/sauvegarder.sh, puis
-- ce fichier en entier, puis supabase_mon_club_journal_verification.sql.

begin;

-- ── 0. Garde-fous ───────────────────────────────────────────────────────────

do $$
begin
  if to_regprocedure('public.mon_club_peut_modifier(uuid)') is null then
    raise exception 'ARRÊT : supabase_mon_club.sql n''a pas été exécuté. Rien n''a été modifié.';
  end if;
  if to_regclass('public.mon_club_journal') is not null then
    raise exception 'ARRÊT : la table du journal existe déjà (script déjà exécuté ?). Rien n''a été modifié.';
  end if;
end;
$$;

-- ── 1. Le journal ───────────────────────────────────────────────────────────

create table public.mon_club_journal (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.profiles(id) on delete cascade,
  -- compte qui a fait le changement (le serveur le lit dans le jeton, pas dans la demande)
  auteur_id uuid references public.profiles(id) on delete set null,
  auteur_libelle text not null default 'Compte du club',
  cree_le timestamptz not null default now(),
  -- ce qui s'est passé dans le menu des éducateurs
  action text not null check (action in ('retire', 'reaffiche')),
  outil text not null check (outil ~ '^[a-z0-9_]{2,40}$'),
  educateur_ids uuid[] not null default '{}',
  -- vrai si l'outil a changé pour tous les éducateurs affiliés du club à ce moment-là
  tous boolean not null default false,
  -- ligne annulée par ce « Rétablir » (vide pour un changement ordinaire)
  retablit_id uuid references public.mon_club_journal(id) on delete set null
);

create index mon_club_journal_club_idx on public.mon_club_journal (club_id, cree_le desc);

-- ── 2. Règles d'accès ───────────────────────────────────────────────────────

alter table public.mon_club_journal enable row level security;

revoke all on public.mon_club_journal from anon, authenticated;
grant select on public.mon_club_journal to authenticated;
grant all on public.mon_club_journal to service_role;

create policy "mon_club_journal_lecture" on public.mon_club_journal
  for select to authenticated
  using (public.mon_club_peut_modifier(club_id));

commit;
