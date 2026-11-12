-- ANNULATION de supabase_mon_club_journal.sql : NE PAS EXÉCUTER sans en parler.
-- Supprime la table du journal et TOUT son historique. Les réglages du menu
-- (mon_club_affichage, mon_club_reglages) ne sont pas touchés. À ne faire
-- qu'après une sauvegarde (~/Sauvegardes-DigitalFootball/sauvegarder.sh) et
-- seulement si le site en ligne ne lit plus cette table (sinon l'écran
-- « Journal » et l'écriture du journal affichent des erreurs).
-- Avant, pour voir ce qui serait perdu :
--   select count(*) from public.mon_club_journal;

begin;
drop table if exists public.mon_club_journal;
commit;
