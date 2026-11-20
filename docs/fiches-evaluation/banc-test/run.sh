#!/bin/zsh
# Banc de test local des fiches d'évaluation (faux comptes, base jetable).
# Démarrer une base : initdb -D <dossier>/data -U postgres -A trust
#   puis pg_ctl -D <dossier>/data -o "-p 54329 -k /tmp -c listen_addresses=127.0.0.1" -l log.txt start
# Lancer depuis ce dossier : ./run.sh (recrée la base « banc », applique blocs 1 et 2, lance tests.sql).
p() { psql -h 127.0.0.1 -p 54329 -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
p -c "drop database if exists banc" -c "create database banc" >/dev/null
p -d banc -f setup.sql >/dev/null && p -d banc -f ~/digital-football/supabase_fiches_evaluation_bloc1.sql >/dev/null && p -d banc -f ~/digital-football/supabase_fiches_evaluation_bloc2.sql >/dev/null || { echo APPLY_FAIL; exit 1; }
p -d banc -f tests.sql 2>&1
