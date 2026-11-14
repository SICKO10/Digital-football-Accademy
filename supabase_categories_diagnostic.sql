-- Bloc 0 (chantier catégories) : diagnostic en LECTURE SEULE.
-- Ne modifie rien dans la base : uniquement des lectures (select).
--
-- À lancer en entier dans Supabase (SQL Editor), d'un seul coup. Résultat :
-- un seul tableau. Bouton « Download CSV », puis enregistrer le fichier dans
-- ~/digital-football sous le nom diagnostic-categories.csv (à ne pas committer :
-- il contient des noms de clubs).
--
-- Colonnes : ordre (tri), partie, club (ou table), detail, nombre.
--   ordre 1 à 12  : la reprise des équipes existantes (règle et cas ambigus)
--   ordre 20 à 25 : la structure réelle des tables (colonnes, règles d'accès,
--                   déclencheurs, liens) absente des fichiers du dépôt.
--
-- Règle de reprise testée ici : même club + même nom nettoyé (majuscules,
-- espaces retirés) = même catégorie. « U15 » + « A » → catégorie U15, équipe A.

with
equipes as (
  select cc.id, cc.club_id, cc.nom, cc.equipe, cc.educateur_id,
         upper(regexp_replace(coalesce(cc.nom, ''), '\s+', '', 'g')) as cle_categorie,
         upper(trim(coalesce(cc.equipe, ''))) as cle_equipe
  from club_categories cc
),
clubs as (
  select p.id,
         coalesce(nullif(trim(p.club), ''), nullif(trim(coalesce(p.prenom, '') || ' ' || coalesce(p.nom, '')), ''), p.id::text) as nom_club
  from profiles_public p
  where p.id in (select club_id from equipes)
),
joueurs_equipe as (
  select ej.id, ej.joueur_id, ej.prenom, ej.nom, e.club_id, e.cle_categorie, e.id as equipe_id
  from equipe_joueurs ej
  join equipes e on e.id = ej.club_categorie_id
),
tables_suivies(nom_table) as (
  values ('club_categories'), ('equipe_joueurs'), ('matchs_equipe'), ('entrainements'),
         ('presences_entrainement'), ('stats_match'), ('disponibilites'), ('convocations'),
         ('convocation_joueurs'), ('convocation_reponses'), ('affiliations'), ('club_educateurs'),
         ('staff_club'), ('role_categories_access'), ('evaluations_joueur'), ('categories')
)

-- 1. Synthèse
select 1 as ordre, 'synthèse'::text as partie, ''::text as club, 'équipes existantes'::text as detail, count(*)::bigint as nombre from equipes
union all
select 1, 'synthèse', '', 'clubs ayant au moins une équipe', count(distinct club_id) from equipes
union all
select 1, 'synthèse', '', 'catégories après reprise', count(distinct club_id::text || '|' || cle_categorie) from equipes
union all
select 1, 'synthèse', '', 'catégories à plusieurs équipes', count(*) from (
  select 1 from equipes group by club_id, cle_categorie having count(*) > 1
) x
union all
select 1, 'synthèse', '', 'équipes sans éducateur', count(*) from equipes where educateur_id is null
union all
select 1, 'synthèse', '', 'une table « categories » existe déjà (1 = oui)', (to_regclass('public.categories') is not null)::int

-- 2. Noms de catégorie tels qu'ils sont écrits (repère les variantes)
union all
select 2, 'nom de catégorie utilisé', '', coalesce(nom, '(vide)'), count(*) from equipes group by nom

-- 3. Lettres d'équipe telles qu'elles sont écrites
union all
select 3, 'lettre d''équipe utilisée', '', coalesce(nullif(equipe, ''), '(vide)'), count(*) from equipes group by equipe

-- 4. Cas : équipe sans lettre
union all
select 4, 'cas : équipe sans lettre', c.nom_club, coalesce(e.nom, '(vide)'), 1
from equipes e join clubs c on c.id = e.club_id
where e.cle_equipe = ''

-- 5. Cas : équipe en double dans le même club
union all
select 5, 'cas : équipe en double', c.nom_club, e.cle_categorie || ' ' || e.cle_equipe, count(*)
from equipes e join clubs c on c.id = e.club_id
group by c.nom_club, e.club_id, e.cle_categorie, e.cle_equipe
having count(*) > 1

-- 6. Cas : même catégorie écrite de plusieurs façons dans un club
union all
select 6, 'cas : catégorie écrite différemment', c.nom_club, string_agg(distinct coalesce(e.nom, '(vide)'), ' | '), count(*)
from equipes e join clubs c on c.id = e.club_id
group by c.nom_club, e.club_id, e.cle_categorie
having count(distinct e.nom) > 1

-- 7. Cas : joueur avec compte inscrit dans 2 équipes de la même catégorie
union all
select 7, 'cas : joueur (compte) dans 2 équipes de la catégorie', c.nom_club, x.cle_categorie, count(*)
from (
  select club_id, cle_categorie, joueur_id from joueurs_equipe
  where joueur_id is not null
  group by club_id, cle_categorie, joueur_id
  having count(distinct equipe_id) > 1
) x join clubs c on c.id = x.club_id
group by c.nom_club, x.club_id, x.cle_categorie

-- 8. Cas : fiche sans compte, même prénom et nom dans 2 équipes de la catégorie
union all
select 8, 'cas : fiche sans compte en double possible', c.nom_club, x.cle_categorie, count(*)
from (
  select club_id, cle_categorie, upper(trim(coalesce(prenom, ''))) || ' ' || upper(trim(coalesce(nom, ''))) as personne
  from joueurs_equipe
  where joueur_id is null
  group by 1, 2, 3
  having count(distinct equipe_id) > 1
) x join clubs c on c.id = x.club_id
group by c.nom_club, x.club_id, x.cle_categorie

-- 9. Cas : fiche joueur sans équipe chez un éducateur affilié à un club
union all
select 9, 'cas : fiche sans équipe (éducateur affilié)', coalesce(c.nom_club, ce.club_id::text), '', count(*)
from equipe_joueurs ej
join club_educateurs ce on ce.educateur_id = ej.educateur_id and ce.statut = 'accepte'
left join clubs c on c.id = ce.club_id
where ej.club_categorie_id is null
group by c.nom_club, ce.club_id

-- 10. Cas : matchs sans équipe chez un éducateur affilié (stats par équipe incomplètes)
union all
select 10, 'cas : match sans équipe (éducateur affilié)', coalesce(c.nom_club, ce.club_id::text), '', count(*)
from matchs_equipe m
join club_educateurs ce on ce.educateur_id = m.educateur_id and ce.statut = 'accepte'
left join clubs c on c.id = ce.club_id
where m.club_categorie_id is null
group by c.nom_club, ce.club_id

-- 11. Cas : entraînements sans équipe chez un éducateur affilié
union all
select 11, 'cas : entraînement sans équipe (éducateur affilié)', coalesce(c.nom_club, ce.club_id::text), '', count(*)
from entrainements t
join club_educateurs ce on ce.educateur_id = t.educateur_id and ce.statut = 'accepte'
left join clubs c on c.id = ce.club_id
where t.club_categorie_id is null
group by c.nom_club, ce.club_id

-- 12. Info : catégorie écrite sur la fiche joueur différente de celle de son équipe
union all
select 12, 'info : catégorie de la fiche ≠ catégorie de l''équipe', '', coalesce(ej.categorie, '(vide)') || ' → ' || coalesce(e.nom, '(vide)'), count(*)
from equipe_joueurs ej join equipes e on e.id = ej.club_categorie_id
where upper(regexp_replace(coalesce(ej.categorie, ''), '\s+', '', 'g')) <> e.cle_categorie
group by ej.categorie, e.nom

-- 20. Colonnes réelles des tables concernées
union all
select 20, 'colonne', col.table_name::text,
       col.column_name::text || ' : ' || col.data_type::text || case when col.is_nullable = 'NO' then ' (obligatoire)' else '' end ||
       coalesce(' défaut ' || col.column_default::text, ''),
       col.ordinal_position::bigint
from information_schema.columns col
where col.table_schema = 'public' and col.table_name in (select nom_table from tables_suivies)

-- 21. Règles d'accès activées ou non
union all
select 21, 'règles d''accès activées', cl.relname::text, case when cl.relrowsecurity then 'oui' else 'NON' end, null
from pg_class cl join pg_namespace n on n.oid = cl.relnamespace
where n.nspname = 'public' and cl.relname in (select nom_table from tables_suivies)

-- 22. Règles d'accès (RLS) réelles
union all
select 22, 'règle d''accès', pol.tablename::text,
       pol.policyname::text || ' [' || pol.cmd || '] USING ' || coalesce(pol.qual, '-') || ' CHECK ' || coalesce(pol.with_check, '-'),
       null
from pg_policies pol
where pol.schemaname = 'public' and pol.tablename in (select nom_table from tables_suivies)

-- 23. Déclencheurs posés sur ces tables
union all
select 23, 'déclencheur', tr.event_object_table::text,
       tr.trigger_name::text || ' [' || tr.action_timing::text || ' ' || tr.event_manipulation::text || '] ' || tr.action_statement::text,
       null
from information_schema.triggers tr
where tr.event_object_schema = 'public' and tr.event_object_table in (select nom_table from tables_suivies)

-- 24. Tables qui pointent vers une équipe ou une fiche joueur
union all
select 24, 'lien vers ' || con.confrelid::regclass::text, con.conrelid::regclass::text,
       con.conname::text || ' : ' || pg_get_constraintdef(con.oid),
       null
from pg_constraint con
where con.contype = 'f'
  and con.confrelid in ('public.club_categories'::regclass, 'public.equipe_joueurs'::regclass)

-- 25. Contraintes d'unicité des tables concernées
union all
select 25, 'unicité', con.conrelid::regclass::text, con.conname::text || ' : ' || pg_get_constraintdef(con.oid), null
from pg_constraint con
where con.contype in ('u', 'p')
  and con.conrelid::regclass::text in (select nom_table from tables_suivies)

order by 1, 3, 4;
