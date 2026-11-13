do $$ begin raise exception 'NE PAS EXECUTER : fichier d''annulation, a lancer seulement sur demande explicite de Kevin.'; end $$;

drop function if exists public.loguer_vue_club(uuid);
drop table if exists public.club_vues_log;
-- Les droits de lecture redonnes aux journaux de stages et de tournois ne sont pas retires : ils corrigent un oubli.
