-- ANNULATION de supabase_mon_club.sql : NE PAS EXÉCUTER sans en parler.
-- Supprime les deux tables Mon club et TOUS les réglages qu'elles contiennent
-- (affichage choisi par les clubs, mode éducateurs). Les dashboards repassent
-- alors à « tout affiché ». À ne faire qu'après une sauvegarde
-- (~/Sauvegardes-DigitalFootball/sauvegarder.sh) et seulement si le site en
-- ligne ne lit plus ces tables (sinon les menus affichent des erreurs).
-- Avant, pour voir ce qui serait perdu :
--   select count(*) from public.mon_club_reglages;
--   select count(*) from public.mon_club_affichage;

begin;
drop table if exists public.mon_club_affichage;
drop table if exists public.mon_club_reglages;
drop function if exists public.mon_club_horodater();
drop function if exists public.mon_club_peut_modifier(uuid);
drop function if exists public.mon_club_educateur_affilie(uuid, uuid);
commit;
