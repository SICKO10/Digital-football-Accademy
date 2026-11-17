-- PLAN-fiche-seance.md, bloc 7 (2026-11-17)
-- Les 8 phases de jeu (src/constants/phasesJeu.js) : préparer la base sans rien perdre.
-- 1. Élargir les contraintes « phase » pour accepter les 8 nouvelles clés (les anciennes restent acceptées).
-- 2. Copier chaque image de fond (terrain_fonds) vers ses nouvelles phases.
--    Rien n'est supprimé ni écrasé : ON CONFLICT DO NOTHING. Script relançable sans effet de bord.
-- Avant : lancer ~/Sauvegardes-DigitalFootball/sauvegarder.sh

begin;

-- 1. Contraintes élargies --------------------------------------------------

alter table public.terrain_fonds drop constraint terrain_fonds_phase_check;
alter table public.terrain_fonds add constraint terrain_fonds_phase_check check (phase = any (array[
  'attaque','defense','transition_att','transition_def','cpa_offensif','cpa_defensif','pressing',
  'construction_basse','construction_mediane','construction_haute','transition_off_def',
  'defense_bloc_haut','defense_bloc_median','defense_bloc_bas','transition_def_off'
]::text[]));

alter table public.terrain_zones drop constraint terrain_zones_phase_check;
alter table public.terrain_zones add constraint terrain_zones_phase_check check (phase = any (array[
  'attaque','defense','transition_att','transition_def','cpa_offensif','cpa_defensif','pressing',
  'construction_basse','construction_mediane','construction_haute','transition_off_def',
  'defense_bloc_haut','defense_bloc_median','defense_bloc_bas','transition_def_off'
]::text[]));

alter table public.terrain_galerie drop constraint terrain_galerie_phase_check;
alter table public.terrain_galerie add constraint terrain_galerie_phase_check check (phase = any (array[
  'attaque','defense','transition_att','transition_def','cpa_offensif','cpa_defensif','pressing',
  'construction_basse','construction_mediane','construction_haute','transition_off_def',
  'defense_bloc_haut','defense_bloc_median','defense_bloc_bas','transition_def_off'
]::text[]));

alter table public.principes_photos drop constraint principes_photos_phase_check;
alter table public.principes_photos add constraint principes_photos_phase_check check (phase = any (array[
  'attaque','defense','transition_att','transition_def','coups_pied_arretes',
  'construction_basse','construction_mediane','construction_haute','transition_off_def',
  'defense_bloc_haut','defense_bloc_median','defense_bloc_bas','transition_def_off'
]::text[]));

-- 2. Copie des images de fond ---------------------------------------------
-- Pressing d'abord : il est prioritaire pour la défense en bloc haut.

insert into public.terrain_fonds (club_id, pole_key, phase, image_url)
select club_id, pole_key, 'defense_bloc_haut', image_url
from public.terrain_fonds where phase = 'pressing'
on conflict (club_id, pole_key, phase) do nothing;

insert into public.terrain_fonds (club_id, pole_key, phase, image_url)
select f.club_id, f.pole_key, n.phase, f.image_url
from public.terrain_fonds f
join (values
  ('attaque', 'construction_basse'),
  ('attaque', 'construction_mediane'),
  ('attaque', 'construction_haute'),
  ('defense', 'defense_bloc_haut'),
  ('defense', 'defense_bloc_median'),
  ('defense', 'defense_bloc_bas'),
  ('transition_att', 'transition_def_off'),
  ('transition_def', 'transition_off_def')
) as n(ancienne, phase) on n.ancienne = f.phase
on conflict (club_id, pole_key, phase) do nothing;

commit;

-- Contrôle : attendu 109 lignes au total (46 anciennes + 63 copies).
select phase, count(*) as images from public.terrain_fonds group by phase order by phase;
