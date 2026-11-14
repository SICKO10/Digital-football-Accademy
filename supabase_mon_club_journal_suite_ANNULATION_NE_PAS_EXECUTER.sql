-- ANNULATION de supabase_mon_club_journal_suite.sql : NE PAS EXÉCUTER sans en parler.
-- Supprime du journal toutes les lignes d'outils fournis et de places (elles
-- ne rentreraient plus dans l'ancienne règle), puis remet l'ancienne règle.
-- Les lignes retire / reaffiche ne sont pas touchées. À ne faire qu'après une
-- sauvegarde (~/Sauvegardes-DigitalFootball/sauvegarder.sh) et seulement si le
-- site en ligne n'écrit plus ces lignes (sinon l'écriture du journal échoue en
-- silence, sans bloquer les changements).
-- Avant, pour voir ce qui serait perdu :
--   select action, count(*) from public.mon_club_journal
--   where action not in ('retire', 'reaffiche') group by action;

begin;
delete from public.mon_club_journal where action not in ('retire', 'reaffiche');
alter table public.mon_club_journal drop constraint mon_club_journal_objet_selon_action;
alter table public.mon_club_journal drop column etat_avant;
alter table public.mon_club_journal alter column outil set not null;
alter table public.mon_club_journal drop constraint mon_club_journal_action_check;
alter table public.mon_club_journal add constraint mon_club_journal_action_check
  check (action in ('retire', 'reaffiche'));
commit;
