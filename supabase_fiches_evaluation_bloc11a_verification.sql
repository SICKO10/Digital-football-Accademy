-- Fiches d'évaluation, bloc 11a : vérification APRÈS application (lecture seule).
-- Résultat attendu : chaque ligne « ok », et le total en dernière ligne.
with c(ordre, nom, ok) as (values
  (1, '4 tables créées', (select count(*) from pg_tables where schemaname = 'public' and tablename in
      ('conservation_evaluations', 'demandes_correction_evaluation', 'conditions_evaluation_versions', 'acceptations_conditions_evaluation')) = 4),
  (2, 'RLS activée sur les 4 tables', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relrowsecurity and c.relname in
      ('conservation_evaluations', 'demandes_correction_evaluation', 'conditions_evaluation_versions', 'acceptations_conditions_evaluation')) = 4),
  (3, '5 règles de lecture ou d''ajout', (select count(*) from pg_policies where schemaname = 'public' and policyname in
      ('cons_lecture', 'dc_lecture', 'dc_ajout', 'cv_lecture', 'ac_lecture')) = 5),
  (4, '13 fonctions', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in
      ('conservation_date_suppression', 'evaluation_joueur_present', 'conservation_evaluations_nuit', 'prolonger_conservation_evaluations',
       'supprimer_donnees_evaluation_joueur', 'demandes_correction_avant_ajout', 'secu_demande_correction_traitant', 'repondre_demande_correction',
       'conditions_evaluation_version_en_vigueur', 'conditions_evaluation_acceptees', 'accepter_conditions_evaluation',
       'evaluations_conditions_acceptees', 'versions_conditions_acceptees')) = 13),
  (5, '4 déclencheurs (conditions x3, demandes)', (select count(*) from pg_trigger where not tgisinternal and tgname in
      ('evaluations_conditions', 'notes_suivi_conditions', 'modeles_evaluation_versions_conditions', 'demandes_correction_avant_ajout')) = 4),
  (6, 'tâche de nuit programmée à 3 h 30', exists (select 1 from cron.job where jobname = 'conservation-evaluations'
      and schedule = '30 3 * * *' and command = 'select public.conservation_evaluations_nuit()' and active)),
  (7, 'journal : 3 nouveaux motifs acceptés', (select pg_get_constraintdef(oid) from pg_constraint where conname = 'journal_acces_evaluations_objet_check')
      like '%suppression_donnees%suppression_auto%prolongation%'),
  (8, 'interrupteur des conditions ÉTEINT', public.conditions_evaluation_version_en_vigueur() is null
      and (select count(*) from public.conditions_evaluation_versions) = 0),
  (9, 'aucun droit visiteur (anon) sur les 4 tables', not exists (select 1 from information_schema.role_table_grants where table_schema = 'public'
      and grantee in ('anon', 'PUBLIC') and table_name in
      ('conservation_evaluations', 'demandes_correction_evaluation', 'conditions_evaluation_versions', 'acceptations_conditions_evaluation'))),
  (10, 'connectés : lecture seule sur suivi, versions, acceptations', not exists (select 1 from information_schema.role_table_grants where table_schema = 'public'
      and grantee = 'authenticated' and privilege_type <> 'SELECT' and table_name in
      ('conservation_evaluations', 'conditions_evaluation_versions', 'acceptations_conditions_evaluation'))),
  (11, 'demandes : connectés lisent et ajoutent seulement', (select string_agg(privilege_type, ',' order by privilege_type) from information_schema.role_table_grants
      where table_schema = 'public' and grantee = 'authenticated' and table_name = 'demandes_correction_evaluation') = 'INSERT,SELECT'),
  (12, 'tâche de nuit non appelable par un compte', not has_function_privilege('authenticated', 'public.conservation_evaluations_nuit()', 'execute')
      and not has_function_privilege('anon', 'public.conservation_evaluations_nuit()', 'execute')),
  (13, 'présence du joueur non appelable par un compte', not has_function_privilege('authenticated', 'public.evaluation_joueur_present(uuid, uuid, uuid, uuid)', 'execute')),
  (14, 'suppression et prolongation fermées aux visiteurs', not has_function_privilege('anon', 'public.supprimer_donnees_evaluation_joueur(uuid, uuid, uuid, uuid[])', 'execute')
      and not has_function_privilege('anon', 'public.prolonger_conservation_evaluations(uuid[])', 'execute')),
  (15, 'fonctions à droits élevés avec chemin de recherche vide', not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef and p.proname in
      ('evaluation_joueur_present', 'conservation_evaluations_nuit', 'prolonger_conservation_evaluations', 'supprimer_donnees_evaluation_joueur',
       'demandes_correction_avant_ajout', 'secu_demande_correction_traitant', 'repondre_demande_correction', 'conditions_evaluation_version_en_vigueur',
       'conditions_evaluation_acceptees', 'accepter_conditions_evaluation', 'evaluations_conditions_acceptees', 'versions_conditions_acceptees')
      and not (coalesce(p.proconfig, '{}') @> array['search_path=""']))),
  (16, 'date de suppression : départ nov. 2026 + 2 saisons = 1er juillet 2029', public.conservation_date_suppression('2026-11-19', 2) = date '2029-07-01'),
  (17, 'suivi de conservation vide (la tâche n''a pas encore tourné)', (select count(*) from public.conservation_evaluations) = 0),
  (18, 'aucune demande, aucune acceptation', (select count(*) from public.demandes_correction_evaluation) = 0
      and (select count(*) from public.acceptations_conditions_evaluation) = 0),
  (19, 'anciennes fiches intactes (34)', (select count(*) from public.evaluations_joueur) = 34),
  (20, 'aperçu : aucune évaluation ni note d''un joueur parti (rien ne sera suivi cette nuit)',
      (select count(*) from public.evaluations e where not public.evaluation_joueur_present(e.club_id, e.educateur_id, e.equipe_joueur_id, e.joueur_id))
      + (select count(*) from public.notes_suivi n where not public.evaluation_joueur_present(n.club_id, n.educateur_id, n.equipe_joueur_id, n.joueur_id)) = 0)
)
select ordre, case when ok then 'ok' else 'ÉCHEC' end as resultat, nom from c
union all
select 99, (count(*) filter (where ok))::text || '/' || count(*)::text, 'total' from c
order by ordre;
