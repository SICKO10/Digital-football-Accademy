#!/bin/zsh
# Banc du bloc 11a (base jetable « banc11 ») : setup + blocs 1, 2 et 11a, puis tests_bloc11a.sql.
# Même base locale que run.sh (port 54329). pg_cron est simulé par un schéma « cron » factice.
cd "${0:A:h}"
p() { psql -h 127.0.0.1 -p 54329 -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
p -c "drop database if exists banc11" -c "create database banc11" >/dev/null
p -d banc11 -f setup.sql >/dev/null \
 && p -d banc11 -c "create schema cron; create function cron.schedule(text, text, text) returns bigint language sql as 'select 1::bigint';" >/dev/null \
 && p -d banc11 -f ~/digital-football/supabase_fiches_evaluation_bloc1.sql >/dev/null \
 && p -d banc11 -f ~/digital-football/supabase_fiches_evaluation_bloc2.sql >/dev/null \
 && p -d banc11 -f ~/digital-football/supabase_fiches_evaluation_bloc11a.sql >/dev/null || { echo APPLY_FAIL; exit 1; }
# En-tête commun (comptes, équipes, modèles) repris de tests.sql
{ sed -n '1,/^\\o \/dev\/null/p' tests.sql | sed '$d'; cat tests_bloc11a.sql; } | p -d banc11 -f - 2>&1
