-- Fiches d'évaluation, bloc 11a : empreinte de la base HORS objets des blocs 1, 2 et 11a
-- (lecture seule ; doit être identique avant et après l'application).
-- Le bloc 11a ne touche aucun objet existant avant le chantier.
select 'cron.job' k, count(*)::text n, md5(string_agg(jobname||schedule||command, '|' order by jobname)) h from cron.job where jobname <> 'conservation-evaluations'
union all
select 'policies' k, count(*)::text n, md5(string_agg(tablename||policyname||cmd||coalesce(qual,'')||coalesce(with_check,''), '|' order by tablename, policyname)) h
  from pg_policies where schemaname='public'
   and tablename not in ('bibliotheque_criteres','parametres_evaluation','modeles_evaluation','modeles_evaluation_versions','criteres_evaluation','evaluations','evaluation_resultats','notes_suivi','journal_acces_evaluations','conservation_evaluations','demandes_correction_evaluation','conditions_evaluation_versions','acceptations_conditions_evaluation')
   and not (tablename = 'evaluations_joueur' and policyname = 'club_lit_evaluations')
union all
select 'tables', count(*)::text, md5(string_agg(relname, '|' order by relname))
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and relkind='r'
   and relname not in ('bibliotheque_criteres','parametres_evaluation','modeles_evaluation','modeles_evaluation_versions','criteres_evaluation','evaluations','evaluation_resultats','notes_suivi','journal_acces_evaluations','conservation_evaluations','demandes_correction_evaluation','conditions_evaluation_versions','acceptations_conditions_evaluation')
union all
select 'functions', count(*)::text, md5(string_agg(proname||pg_get_function_identity_arguments(p.oid)||md5(prosrc), '|' order by proname, pg_get_function_identity_arguments(p.oid)))
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public'
   and proname not in ('a_permission_modeles_evaluation','secu_educateur_peut_modele_evaluation','secu_modele_evaluation_lecture',
                       'secu_modele_evaluation_edition','secu_modele_evaluation_acces','secu_version_evaluation_acces',
                       'modeles_evaluation_avant_ecriture','modeles_evaluation_versions_avant_ecriture',
                       'criteres_evaluation_avant_ecriture','parametres_evaluation_avant_ecriture',
                       'evaluation_cle_categorie','evaluation_famille_poste','evaluation_contexte_joueur','secu_categorie_effectif',
                       'secu_staff_couvre_categorie','a_permission_evaluations','secu_membre_club','secu_educateur_a_le_joueur',
                       'secu_est_le_joueur','secu_est_parent_du_joueur','secu_evaluation_droit_ligne','secu_evaluation_droit',
                       'secu_note_droit_ligne','secu_version_lue_par_evaluation','secu_modele_lu_par_evaluation','noter_acces_evaluations',
                       'evaluations_avant_ecriture','evaluation_resultats_avant_ecriture','notes_suivi_avant_ecriture','notes_suivi_apres_suppression',
                       'conservation_date_suppression','evaluation_joueur_present','conservation_evaluations_nuit','prolonger_conservation_evaluations',
                       'supprimer_donnees_evaluation_joueur','demandes_correction_avant_ajout','secu_demande_correction_traitant','repondre_demande_correction',
                       'conditions_evaluation_version_en_vigueur','conditions_evaluation_acceptees','accepter_conditions_evaluation',
                       'evaluations_conditions_acceptees','versions_conditions_acceptees')
union all
select 'constraints', count(*)::text, md5(string_agg(c.conrelid::regclass::text||conname||pg_get_constraintdef(c.oid), '|' order by c.conrelid::regclass::text, conname))
  from pg_constraint c join pg_namespace n on n.oid=c.connamespace
 where n.nspname='public' and conname <> 'role_permissions_section_check'
   and c.conrelid::regclass::text not in ('bibliotheque_criteres','parametres_evaluation','modeles_evaluation','modeles_evaluation_versions','criteres_evaluation','evaluations','evaluation_resultats','notes_suivi','journal_acces_evaluations','conservation_evaluations','demandes_correction_evaluation','conditions_evaluation_versions','acceptations_conditions_evaluation')
union all
select 'triggers', count(*)::text, md5(string_agg(tgrelid::regclass::text||tgname, '|' order by tgrelid::regclass::text, tgname))
  from pg_trigger where not tgisinternal
   and tgrelid::regclass::text not in ('bibliotheque_criteres','parametres_evaluation','modeles_evaluation','modeles_evaluation_versions','criteres_evaluation','evaluations','evaluation_resultats','notes_suivi','journal_acces_evaluations','conservation_evaluations','demandes_correction_evaluation','conditions_evaluation_versions','acceptations_conditions_evaluation')
union all
select 'droits tables', count(*)::text, md5(string_agg(table_name||grantee||privilege_type, '|' order by table_name, grantee, privilege_type))
  from information_schema.role_table_grants where table_schema='public'
   and table_name not in ('bibliotheque_criteres','parametres_evaluation','modeles_evaluation','modeles_evaluation_versions','criteres_evaluation','evaluations','evaluation_resultats','notes_suivi','journal_acces_evaluations','conservation_evaluations','demandes_correction_evaluation','conditions_evaluation_versions','acceptations_conditions_evaluation')
union all
select 'evaluations_joueur (lignes)', count(*)::text, md5(string_agg(id::text||updated_at::text, '|' order by id)) from public.evaluations_joueur
union all
select 'tests_physiques (lignes)', count(*)::text, md5(string_agg(id::text, '|' order by id)) from public.tests_physiques
union all
select 'role_permissions (lignes)', count(*)::text, md5(string_agg(id::text||section||can_view||can_edit, '|' order by id)) from public.role_permissions;
