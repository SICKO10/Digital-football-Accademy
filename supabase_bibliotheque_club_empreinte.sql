-- Empreinte de la base HORS objets du bloc 1 (doit être identique avant et après)
select 'policies' k, count(*)::text n, md5(string_agg(tablename||policyname||cmd||coalesce(qual,'')||coalesce(with_check,''), '|' order by tablename, policyname)) h from pg_policies where schemaname='public' and tablename <> 'bibliotheque_club_procedes'
union all
select 'tables', count(*)::text, md5(string_agg(relname, '|' order by relname)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and relkind='r' and relname <> 'bibliotheque_club_procedes'
union all
select 'functions', count(*)::text, md5(string_agg(proname||pg_get_function_identity_arguments(p.oid)||md5(prosrc), '|' order by proname, pg_get_function_identity_arguments(p.oid))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname not in ('a_permission_bibliotheque','secu_educateur_accepte_club','bibliotheque_club_procedes_avant_ecriture')
union all
select 'constraints', count(*)::text, md5(string_agg(c.conrelid::regclass::text||conname||pg_get_constraintdef(c.oid), '|' order by c.conrelid::regclass::text, conname)) from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public' and c.conrelid <> coalesce(to_regclass('public.bibliotheque_club_procedes'),0::oid) and conname <> 'role_permissions_section_check'
union all
select 'triggers', count(*)::text, md5(string_agg(tgrelid::regclass::text||tgname, '|' order by tgrelid::regclass::text, tgname)) from pg_trigger where not tgisinternal and tgrelid <> coalesce(to_regclass('public.bibliotheque_club_procedes'),0::oid);
