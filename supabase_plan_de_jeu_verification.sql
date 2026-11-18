-- =====================================================================
-- PLAN DE JEU : vérification du bloc 2 (lecture seule, ne change rien)
-- À exécuter APRÈS supabase_plan_de_jeu.sql. Chaque ligne doit afficher OK.
-- =====================================================================

WITH
cols AS (
  SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name IN ('principes_jeu', 'terrain_zones')
),
fks AS (
  SELECT conrelid::regclass::text AS tbl, confrelid::regclass::text AS cible,
         confdeltype, (SELECT attname FROM pg_attribute WHERE attrelid = conrelid AND attnum = conkey[1]) AS col
    FROM pg_constraint
   WHERE contype = 'f' AND conrelid IN ('public.principes_jeu'::regclass, 'public.terrain_zones'::regclass)
),
pols AS (
  SELECT tablename, policyname, permissive, cmd FROM pg_policies
   WHERE schemaname = 'public' AND tablename IN ('principes_jeu', 'terrain_zones')
),
fns AS (
  SELECT p.proname, p.prosecdef, p.proconfig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname LIKE 'pdj\_%'
),
controles(ordre, controle, ok) AS (
  VALUES
  (1, 'principes_jeu.zone_id (uuid) existe',
      EXISTS (SELECT 1 FROM cols WHERE table_name = 'principes_jeu' AND column_name = 'zone_id' AND data_type = 'uuid')),
  (2, 'principes_jeu.lignes (liste de textes, jamais vide de valeur) existe',
      EXISTS (SELECT 1 FROM cols WHERE table_name = 'principes_jeu' AND column_name = 'lignes' AND udt_name = '_text' AND is_nullable = 'NO')),
  (3, 'principes_jeu.club_categorie_id (uuid) existe',
      EXISTS (SELECT 1 FROM cols WHERE table_name = 'principes_jeu' AND column_name = 'club_categorie_id' AND data_type = 'uuid')),
  (4, 'terrain_zones.club_categorie_id (uuid) existe',
      EXISTS (SELECT 1 FROM cols WHERE table_name = 'terrain_zones' AND column_name = 'club_categorie_id' AND data_type = 'uuid')),
  (5, 'Lien principe vers zone : vidé si la zone est supprimée',
      EXISTS (SELECT 1 FROM fks WHERE tbl = 'principes_jeu' AND col = 'zone_id' AND cible = 'terrain_zones' AND confdeltype = 'n')),
  (6, 'Principes d''équipe supprimés avec l''équipe',
      EXISTS (SELECT 1 FROM fks WHERE tbl = 'principes_jeu' AND col = 'club_categorie_id' AND cible = 'club_categories' AND confdeltype = 'c')),
  (7, 'Zones d''équipe supprimées avec l''équipe',
      EXISTS (SELECT 1 FROM fks WHERE tbl = 'terrain_zones' AND col = 'club_categorie_id' AND cible = 'club_categories' AND confdeltype = 'c')),
  (8, 'Lignes limitées à gardien, defense, milieu, attaque',
      EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'principes_jeu_lignes_check' AND conrelid = 'public.principes_jeu'::regclass)),
  (9, 'principes_jeu : exactement les 8 règles attendues',
      (SELECT array_agg(policyname::text ORDER BY policyname) FROM pols WHERE tablename = 'principes_jeu')
      = ARRAY['club_gere_principes', 'educateur_ajoute_principes', 'educateur_lit_principes',
              'educateur_modifie_principes', 'educateur_supprime_principes', 'joueur_lit_principes',
              'parent_lit_principes', 'verrou_outils']),
  (10, 'terrain_zones : exactement les 7 règles attendues',
      (SELECT array_agg(policyname::text ORDER BY policyname) FROM pols WHERE tablename = 'terrain_zones')
      = ARRAY['club_gere_zones', 'educateur_ajoute_zones', 'educateur_lit_zones',
              'educateur_modifie_zones', 'educateur_supprime_zones', 'joueur_lit_zones', 'parent_lit_zones']),
  (11, 'Verrou des outils toujours en place sur principes_jeu (restrictif, tout)',
      EXISTS (SELECT 1 FROM pols WHERE tablename = 'principes_jeu' AND policyname = 'verrou_outils'
                                   AND permissive = 'RESTRICTIVE' AND cmd = 'ALL')),
  (12, 'Ancien accès large des éducateurs retiré (2 tables)',
      NOT EXISTS (SELECT 1 FROM pols WHERE policyname IN ('educateur_gere_principes', 'educateur_gere_zones'))),
  (13, 'Éducateurs : lecture seule pour la lecture, écriture séparée (2 tables)',
      (SELECT count(*) FROM pols WHERE policyname LIKE 'educateur\_%' AND cmd = 'SELECT') = 2
      AND (SELECT count(*) FROM pols WHERE policyname LIKE 'educateur\_%' AND cmd IN ('INSERT', 'UPDATE', 'DELETE')) = 6),
  (14, 'Les 4 fonctions d''aide existent, protégées, avec chemin fixé',
      (SELECT count(*) FROM fns WHERE prosecdef AND proconfig::text LIKE '%search_path=public%') = 4),
  (15, 'Garde-fou de cohérence actif sur les 2 tables',
      (SELECT count(*) FROM pg_trigger
        WHERE tgname IN ('pdj_coherence_principes', 'pdj_coherence_zones') AND NOT tgisinternal AND tgenabled = 'O') = 2),
  (16, 'Aucune ligne existante déplacée au niveau équipe',
      NOT EXISTS (SELECT 1 FROM public.principes_jeu WHERE club_categorie_id IS NOT NULL)
      AND NOT EXISTS (SELECT 1 FROM public.terrain_zones WHERE club_categorie_id IS NOT NULL)),
  (17, 'Aucune donnée perdue (au moins 1 principe comme avant)',
      (SELECT count(*) FROM public.principes_jeu) >= 1),
  (18, 'Fonction d''aide non utilisable sans connexion (anon)',
      NOT has_function_privilege('anon', 'public.pdj_educateur_peut_ecrire(uuid, uuid)', 'EXECUTE'))
)
SELECT ordre, controle, CASE WHEN ok THEN 'OK' ELSE 'ERREUR' END AS resultat
  FROM controles
 ORDER BY ordre;
