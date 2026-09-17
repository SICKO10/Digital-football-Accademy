-- Correctif : les tables tournois_* avaient été créées avec le schéma du brief
-- d'origine (club_id TEXT, categorie TEXT, joueur_id → profiles). À exécuter
-- seulement si les 3 tables sont vides (cf. check_tournois_counts.sql).

DROP TABLE IF EXISTS tournois_convocations CASCADE;
DROP TABLE IF EXISTS tournois_matchs CASCADE;
DROP TABLE IF EXISTS tournois_participation CASCADE;

-- Puis exécuter en entier supabase_tournois_participation.sql (schéma correct :
-- club_id UUID → profiles, club_categorie_id UUID → club_categories,
-- equipe_joueur_id UUID → equipe_joueurs, fonction is_club_manager + RLS).
