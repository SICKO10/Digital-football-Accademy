-- Contrôle des ouvertures (chantier sécurité novembre, bloc 0, réutilisé au bloc 9).
-- LECTURE SEULE : une seule lecture (select), aucune écriture.
--
-- À lancer en entier dans Supabase (SQL Editor). Résultat : un seul tableau.
-- « Download CSV », puis enregistrer dans ~/digital-football sous le nom
-- controle-ouvertures-AAAA-MM-JJ.csv (le premier passage sert d'état de départ,
-- à comparer avec celui du bloc 9).
--
-- Colonnes : gravite, type, objet, detail.
--   1 GRAVE     : une règle laisse passer TOUT LE MONDE, même sans compte
--                 (USING true ou WITH CHECK true pour anon ou PUBLIC),
--                 ou une table lisible par anon sans aucune RLS.
--   2 OUVERTE   : une règle laisse passer TOUT COMPTE CONNECTÉ (true pour
--                 authenticated) : c'est le cas des 4 tables du chantier.
--   3 À REGARDER: RLS activée mais aucune règle (table fermée à tous, parfois
--                 voulu), ou règle écrite explicitement pour anon.

with
politiques as (
  select p.schemaname, p.tablename, p.policyname, p.permissive, p.cmd, p.roles,
         p.qual, p.with_check,
         coalesce(p.qual, '') ~ '^\s*\(*\s*true\s*\)*\s*$' as using_vrai,
         coalesce(p.with_check, '') ~ '^\s*\(*\s*true\s*\)*\s*$' as check_vrai,
         (p.roles && array['public', 'anon']::name[]) as pour_anon,
         (p.roles && array['authenticated']::name[]) as pour_connectes
  from pg_policies p
  where p.schemaname in ('public', 'storage')
),
tables_rls as (
  select n.nspname as schemaname, c.relname as tablename, c.relrowsecurity as rls,
         has_table_privilege('anon', c.oid, 'SELECT') as anon_lit,
         has_table_privilege('anon', c.oid, 'INSERT') or has_table_privilege('anon', c.oid, 'UPDATE')
           or has_table_privilege('anon', c.oid, 'DELETE') as anon_ecrit,
         has_table_privilege('authenticated', c.oid, 'SELECT') as connectes_lisent
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
),
lignes as (
  select case when p.pour_anon then '1 GRAVE' else '2 OUVERTE' end as gravite,
         'Règle true' as type,
         p.schemaname || '.' || p.tablename || ' · ' || p.policyname as objet,
         p.permissive || ' · ' || p.cmd || ' · rôles=' || array_to_string(p.roles, ',')
         || ' · USING=' || coalesce(p.qual, '(aucun)')
         || ' · WITH CHECK=' || coalesce(p.with_check, '(aucun)') as detail
  from politiques p
  where (p.using_vrai or p.check_vrai)
    and (p.pour_anon or p.pour_connectes)
    and p.permissive = 'PERMISSIVE'

  union all
  select '1 GRAVE', 'Sans RLS', t.schemaname || '.' || t.tablename,
         'RLS désactivée · anon lit=' || t.anon_lit || ' · anon écrit=' || t.anon_ecrit
         || ' · connectés lisent=' || t.connectes_lisent
  from tables_rls t
  where not t.rls and (t.anon_lit or t.anon_ecrit or t.connectes_lisent)

  union all
  select '3 À REGARDER', 'RLS sans règle', t.schemaname || '.' || t.tablename,
         'RLS activée, aucune règle : personne ne lit par l''API (sauf fonctions SECURITY DEFINER)'
  from tables_rls t
  where t.rls and not exists (select 1 from politiques p where p.schemaname = t.schemaname and p.tablename = t.tablename)

  union all
  select '3 À REGARDER', 'Règle pour anon', p.schemaname || '.' || p.tablename || ' · ' || p.policyname,
         p.cmd || ' · rôles=' || array_to_string(p.roles, ',')
         || ' · USING=' || coalesce(p.qual, '(aucun)')
         || ' · WITH CHECK=' || coalesce(p.with_check, '(aucun)')
  from politiques p
  where 'anon' = any(p.roles) and not (p.using_vrai or p.check_vrai)
)
select gravite, type, objet, detail
from lignes
order by gravite, type, objet;
