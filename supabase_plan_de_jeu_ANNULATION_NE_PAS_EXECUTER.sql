-- =====================================================================
-- NE PAS EXECUTER, SAUF DÉCISION EXPRESSE DE RETOUR ARRIÈRE
-- Annule supabase_plan_de_jeu.sql (bloc 2 de PLAN-plan-de-jeu.md).
--
-- ATTENTION : supprime les colonnes zone_id, lignes et club_categorie_id.
-- Tout ce qui y a été saisi est PERDU, et les principes et zones ajoutés
-- par les éducateurs pour leur équipe sont SUPPRIMÉS (sinon ils
-- deviendraient visibles par tout le club). Faire une sauvegarde avant.
-- Remet exactement les règles d'accès relevées en prod le 2026-11-18.
-- =====================================================================

-- Garde-fou : ce fichier refuse de tourner tant que la ligne ci-dessous n'est pas modifiée à la main.
DO $$ BEGIN RAISE EXCEPTION 'Annulation bloquée : modifier ce garde-fou seulement si le retour arrière est décidé.'; END $$;

BEGIN;

-- Ajouts d'équipe : supprimés (ils n'existaient pas avant)
DELETE FROM public.principes_jeu WHERE club_categorie_id IS NOT NULL;
DELETE FROM public.terrain_zones WHERE club_categorie_id IS NOT NULL;

-- Nouvelles règles
DROP POLICY IF EXISTS educateur_lit_principes ON public.principes_jeu;
DROP POLICY IF EXISTS educateur_ajoute_principes ON public.principes_jeu;
DROP POLICY IF EXISTS educateur_modifie_principes ON public.principes_jeu;
DROP POLICY IF EXISTS educateur_supprime_principes ON public.principes_jeu;
DROP POLICY IF EXISTS joueur_lit_principes ON public.principes_jeu;
DROP POLICY IF EXISTS parent_lit_principes ON public.principes_jeu;
DROP POLICY IF EXISTS educateur_lit_zones ON public.terrain_zones;
DROP POLICY IF EXISTS educateur_ajoute_zones ON public.terrain_zones;
DROP POLICY IF EXISTS educateur_modifie_zones ON public.terrain_zones;
DROP POLICY IF EXISTS educateur_supprime_zones ON public.terrain_zones;
DROP POLICY IF EXISTS joueur_lit_zones ON public.terrain_zones;
DROP POLICY IF EXISTS parent_lit_zones ON public.terrain_zones;

-- Anciennes règles, à l'identique
CREATE POLICY educateur_gere_principes ON public.principes_jeu
  FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM club_educateurs
                  WHERE club_educateurs.club_id = principes_jeu.club_id
                    AND club_educateurs.educateur_id = auth.uid()
                    AND club_educateurs.statut = 'accepte'::text))
  WITH CHECK (EXISTS (SELECT 1 FROM club_educateurs
                  WHERE club_educateurs.club_id = principes_jeu.club_id
                    AND club_educateurs.educateur_id = auth.uid()
                    AND club_educateurs.statut = 'accepte'::text));

CREATE POLICY joueur_lit_principes ON public.principes_jeu
  FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
                  WHERE a.joueur_id = auth.uid() AND a.statut = 'accepte'::text
                    AND ce.club_id = principes_jeu.club_id AND ce.statut = 'accepte'::text));

CREATE POLICY parent_lit_principes ON public.principes_jeu
  FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
                  WHERE a.statut = 'accepte'::text AND est_parent_accepte_de(a.joueur_id)
                    AND ce.club_id = principes_jeu.club_id AND ce.statut = 'accepte'::text));

CREATE POLICY educateur_gere_zones ON public.terrain_zones
  FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM club_educateurs
                  WHERE club_educateurs.club_id = terrain_zones.club_id
                    AND club_educateurs.educateur_id = auth.uid()
                    AND club_educateurs.statut = 'accepte'::text))
  WITH CHECK (EXISTS (SELECT 1 FROM club_educateurs
                  WHERE club_educateurs.club_id = terrain_zones.club_id
                    AND club_educateurs.educateur_id = auth.uid()
                    AND club_educateurs.statut = 'accepte'::text));

CREATE POLICY joueur_lit_zones ON public.terrain_zones
  FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
                  WHERE a.joueur_id = auth.uid() AND a.statut = 'accepte'::text
                    AND ce.club_id = terrain_zones.club_id AND ce.statut = 'accepte'::text));

CREATE POLICY parent_lit_zones ON public.terrain_zones
  FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM affiliations a JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
                  WHERE a.statut = 'accepte'::text AND est_parent_accepte_de(a.joueur_id)
                    AND ce.club_id = terrain_zones.club_id AND ce.statut = 'accepte'::text));

-- Garde-fou, fonctions, colonnes
DROP TRIGGER IF EXISTS pdj_coherence_principes ON public.principes_jeu;
DROP TRIGGER IF EXISTS pdj_coherence_zones ON public.terrain_zones;
DROP FUNCTION IF EXISTS public.pdj_coherence();
DROP FUNCTION IF EXISTS public.pdj_educateur_peut_ecrire(uuid, uuid);
DROP FUNCTION IF EXISTS public.pdj_joueur_dans_equipe(uuid);
DROP FUNCTION IF EXISTS public.pdj_parent_enfant_dans_equipe(uuid);

ALTER TABLE public.principes_jeu
  DROP COLUMN IF EXISTS zone_id,
  DROP COLUMN IF EXISTS lignes,
  DROP COLUMN IF EXISTS club_categorie_id;
ALTER TABLE public.terrain_zones
  DROP COLUMN IF EXISTS club_categorie_id;

COMMIT;
