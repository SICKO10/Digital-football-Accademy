-- Empreinte de la base HORS objets du bloc 5 (doit être identique avant et après).
-- Exclus : règles de bibliotheque_videos, règle lecture_exercices_df_club,
-- les 3 fonctions et le déclencheur ajoutés par le bloc 5.
select 'policies' k, count(*)::text n, md5(string_agg(tablename||policyname||cmd||roles::text||coalesce(qual,'')||coalesce(with_check,''), '|' order by tablename, policyname)) h from pg_policies where schemaname='public' and tablename <> 'bibliotheque_videos' and policyname <> 'lecture_exercices_df_club'
union all
select 'tables', count(*)::text, md5(string_agg(relname, '|' order by relname)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and relkind='r'
union all
select 'functions', count(*)::text, md5(string_agg(proname||pg_get_function_identity_arguments(p.oid)||md5(prosrc), '|' order by proname, pg_get_function_identity_arguments(p.oid))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname not in ('secu_lit_bibliotheque_df','secu_joueur_affilie','bibliotheque_videos_portee_figee')
union all
select 'constraints', count(*)::text, md5(string_agg(c.conrelid::regclass::text||conname||pg_get_constraintdef(c.oid), '|' order by c.conrelid::regclass::text, conname)) from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public'
union all
select 'triggers', count(*)::text, md5(string_agg(tgrelid::regclass::text||tgname, '|' order by tgrelid::regclass::text, tgname)) from pg_trigger where not tgisinternal and tgname <> 'bibliotheque_videos_portee_figee'
union all
select 'grants', count(*)::text, md5(string_agg(table_name||grantee||privilege_type, '|' order by table_name, grantee, privilege_type)) from information_schema.role_table_grants where table_schema='public';
