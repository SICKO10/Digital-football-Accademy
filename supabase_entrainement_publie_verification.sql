-- Vérification après supabase_entrainement_publie.sql. Lecture seule, ne
-- modifie rien. Résultat attendu : chaque ligne avec ok = true.
SELECT 'table seances_publiees, sécurité activée' AS test,
       COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.seances_publiees')), false) AS ok
UNION ALL
SELECT 'table seances_publiees_destinataires, sécurité activée',
       COALESCE((SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.seances_publiees_destinataires')), false)
UNION ALL
SELECT '6 règles de sécurité en place',
       (SELECT count(*) FROM pg_policies WHERE tablename IN ('seances_publiees', 'seances_publiees_destinataires')) = 6
UNION ALL
SELECT 'hiver 21h59 Paris : visible', seance_publiee_ouverte('2026-11-02', '2026-11-02 20:59:00+00') = true
UNION ALL
SELECT 'hiver 22h01 Paris : masqué', seance_publiee_ouverte('2026-11-02', '2026-11-02 21:01:00+00') = false
UNION ALL
SELECT 'été 21h59 Paris : visible', seance_publiee_ouverte('2026-07-01', '2026-07-01 19:59:00+00') = true
UNION ALL
SELECT 'été 22h01 Paris : masqué', seance_publiee_ouverte('2026-07-01', '2026-07-01 20:01:00+00') = false
UNION ALL
SELECT 'séance d''hier : masquée', seance_publiee_ouverte('2026-11-01', '2026-11-02 10:00:00+00') = false
UNION ALL
SELECT 'séance de demain : visible dès la publication', seance_publiee_ouverte('2026-11-03', '2026-11-02 18:00:00+00') = true
UNION ALL
SELECT 'aucune publication pour l''instant', (SELECT count(*) FROM seances_publiees) = 0;
