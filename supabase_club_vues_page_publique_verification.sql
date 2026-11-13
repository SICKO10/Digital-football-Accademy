-- Lecture seule : doit renvoyer 1 ligne par contrôle, avec ok = true.
select 'table club_vues_log' as controle, to_regclass('public.club_vues_log') is not null as ok
union all
select 'rls active', coalesce((select relrowsecurity from pg_class where oid = 'public.club_vues_log'::regclass), false)
union all
select 'fonction loguer_vue_club', to_regproc('public.loguer_vue_club') is not null
union all
select 'lecture autorisee sur ' || t, has_table_privilege('authenticated', 'public.' || t, 'select')
from unnest(array['club_vues_log', 'stage_vues_log', 'stage_sponsor_clics_log', 'tournoi_vues_log', 'tournoi_sponsor_clics_log']) as t
where to_regclass('public.' || t) is not null;
