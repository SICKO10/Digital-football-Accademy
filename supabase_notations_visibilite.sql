-- Visibilité des notes de match pour les joueurs (et parents) — réglable par
-- match, notes et commentaires séparément.
--
-- 1. Deux réglages sur matchs_equipe (true par défaut : rien ne change pour
--    les matchs déjà notés).
-- 2. Les joueurs/parents ne lisent plus notations_match directement : la
--    fonction mes_notations_match renvoie la note (et les critères) seulement
--    si notes_visibles_joueurs, le commentaire seulement si
--    commentaires_visibles_joueurs. RLS étant par ligne (pas par colonne),
--    c'est le seul moyen de masquer réellement une colonne sans masquer
--    l'autre.
-- 3. Retrait des policies de lecture directe joueur / parent sur
--    notations_match. La policy éducateur (nm_educateur) est inchangée.
--
-- À exécuter AVANT de déployer le code qui appelle mes_notations_match.
-- NE PAS EXÉCUTER SANS VALIDATION EXPLICITE.

begin;

alter table public.matchs_equipe
  add column if not exists notes_visibles_joueurs boolean not null default true,
  add column if not exists commentaires_visibles_joueurs boolean not null default true;

create or replace function public.mes_notations_match(p_equipe_joueur_id uuid)
returns table (
  id uuid, match_id uuid, note numeric, commentaire text, criteres jsonb, created_at timestamptz,
  note_visible boolean, commentaire_visible boolean,
  adversaire text, date date, domicile boolean, competition text, score_nous integer, score_eux integer
)
language sql
security definer
stable
set search_path = ''
as $$
  select n.id, n.match_id,
         case when m.notes_visibles_joueurs then n.note end,
         case when m.commentaires_visibles_joueurs then n.commentaire end,
         case when m.notes_visibles_joueurs then n.criteres end,
         n.created_at,
         m.notes_visibles_joueurs, m.commentaires_visibles_joueurs,
         m.adversaire, m.date, m.domicile, m.competition, m.score_nous, m.score_eux
  from public.notations_match n
  join public.matchs_equipe m on m.id = n.match_id
  where n.joueur_id = p_equipe_joueur_id
    and not coalesce(n.est_note_equipe, false)
    and (
      exists (select 1 from public.equipe_joueurs ej where ej.id = p_equipe_joueur_id and ej.joueur_id = auth.uid())
      or public.est_parent_accepte_de(p_equipe_joueur_id)
    )
  order by n.created_at desc;
$$;

revoke execute on function public.mes_notations_match(uuid) from public, anon;
grant execute on function public.mes_notations_match(uuid) to authenticated;

drop policy if exists "nm_joueur_read" on public.notations_match;
drop policy if exists "parent_lit_donnees_enfant" on public.notations_match;

commit;
