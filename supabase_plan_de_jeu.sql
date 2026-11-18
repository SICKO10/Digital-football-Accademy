-- =====================================================================
-- PLAN DE JEU : bloc 2 (PLAN-plan-de-jeu.md)
-- Tables touchées : principes_jeu, terrain_zones (rien d'autre).
--
-- Ce que fait ce fichier :
--   1. principes_jeu  : + zone_id (lien vers une zone, vidé si la zone est supprimée)
--                       + lignes (gardien, defense, milieu, attaque ; vide = tout le monde)
--                       + club_categorie_id (vide = plan du club ; rempli = ajout d'une équipe)
--   2. terrain_zones  : + club_categorie_id (même sens)
--   3. Règles d'accès :
--        club + staff      : inchangés (tout le plan du club, y compris les ajouts des équipes)
--        éducateur accepté : lit tout le plan de son club ; n'écrit que les lignes
--                            d'une de SES équipes, et seulement s'il a le droit
--                            « éditer le projet sportif » (même calcul que l'écran)
--        joueur, parent    : plan du club + ajouts de l'équipe du joueur seulement
--        verrou_outils     : règle restrictive de principes_jeu gardée telle quelle
--   4. Garde-fou : une ligne d'équipe doit appartenir au même club, et un principe
--      ne peut être relié qu'à une zone du même club et du même niveau.
--
-- Avant : lancer ~/Sauvegardes-DigitalFootball/sauvegarder.sh
-- Si l'état de la base n'est pas celui attendu, le fichier s'arrête sans rien changer.
-- Après : exécuter supabase_plan_de_jeu_verification.sql
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0. Contrôle de l'état attendu (arrêt complet si un point ne va pas)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_attendues text[] := ARRAY[
    'principes_jeu:club_gere_principes', 'principes_jeu:educateur_gere_principes',
    'principes_jeu:joueur_lit_principes', 'principes_jeu:parent_lit_principes',
    'principes_jeu:verrou_outils',
    'terrain_zones:club_gere_zones', 'terrain_zones:educateur_gere_zones',
    'terrain_zones:joueur_lit_zones', 'terrain_zones:parent_lit_zones'
  ];
  v_reelles text[];
BEGIN
  SELECT array_agg(tablename || ':' || policyname ORDER BY tablename, policyname)
    INTO v_reelles
    FROM pg_policies
   WHERE schemaname = 'public' AND tablename IN ('principes_jeu', 'terrain_zones');

  IF NOT (v_reelles @> v_attendues AND v_attendues @> v_reelles) THEN
    RAISE EXCEPTION 'ARRET : les règles d''accès ne sont pas celles attendues (%). Rien n''a été changé.', v_reelles;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public'
                AND ((table_name = 'principes_jeu' AND column_name IN ('zone_id', 'lignes', 'club_categorie_id'))
                  OR (table_name = 'terrain_zones' AND column_name = 'club_categorie_id'))) THEN
    RAISE EXCEPTION 'ARRET : une des nouvelles colonnes existe déjà (fichier déjà exécuté ?). Rien n''a été changé.';
  END IF;

  IF (SELECT count(*) FROM information_schema.columns
       WHERE table_schema = 'public'
         AND ((table_name = 'club_educateurs' AND column_name = 'peut_editer_projet_sportif')
           OR (table_name = 'profiles' AND column_name = 'educateurs_editent_projet_sportif'))) <> 2 THEN
    RAISE EXCEPTION 'ARRET : colonnes de droit « éditer le projet sportif » introuvables. Rien n''a été changé.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
              WHERE n.nspname = 'public' AND p.proname LIKE 'pdj\_%') THEN
    RAISE EXCEPTION 'ARRET : des fonctions pdj_ existent déjà. Rien n''a été changé.';
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 1. Colonnes
-- ---------------------------------------------------------------------
ALTER TABLE public.principes_jeu
  ADD COLUMN zone_id uuid REFERENCES public.terrain_zones(id) ON DELETE SET NULL,
  ADD COLUMN lignes text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN club_categorie_id uuid REFERENCES public.club_categories(id) ON DELETE CASCADE;

ALTER TABLE public.principes_jeu
  ADD CONSTRAINT principes_jeu_lignes_check
  CHECK (lignes <@ ARRAY['gardien', 'defense', 'milieu', 'attaque']::text[]);

ALTER TABLE public.terrain_zones
  ADD COLUMN club_categorie_id uuid REFERENCES public.club_categories(id) ON DELETE CASCADE;

-- Suppression d'une équipe : ses ajouts disparaissent avec elle (CASCADE).
-- Ils ne remontent jamais au niveau club, sinon tout le club verrait les consignes d'un coach.

CREATE INDEX principes_jeu_club_categorie_id_idx ON public.principes_jeu (club_categorie_id);
CREATE INDEX principes_jeu_zone_id_idx ON public.principes_jeu (zone_id);
CREATE INDEX terrain_zones_club_categorie_id_idx ON public.terrain_zones (club_categorie_id);

-- ---------------------------------------------------------------------
-- 2. Fonctions d'aide (lisent les tables sans dépendre de leurs propres règles)
-- ---------------------------------------------------------------------

-- L'utilisateur connecté peut-il écrire une ligne de ce club pour cette équipe ?
-- Vrai seulement si : équipe renseignée, équipe de ce club dont il est l'éducateur,
-- éducateur accepté dans le club, et droit « éditer le projet sportif »
-- (droit individuel s'il est renseigné, sinon réglage général du club).
CREATE FUNCTION public.pdj_educateur_peut_ecrire(p_club_id uuid, p_club_categorie_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p_club_categorie_id IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM club_categories cc
        WHERE cc.id = p_club_categorie_id
          AND cc.club_id = p_club_id
          AND cc.educateur_id = auth.uid()
     )
     AND EXISTS (
       SELECT 1 FROM club_educateurs ce
         JOIN profiles c ON c.id = ce.club_id
        WHERE ce.club_id = p_club_id
          AND ce.educateur_id = auth.uid()
          AND ce.statut = 'accepte'
          AND COALESCE(ce.peut_editer_projet_sportif, c.educateurs_editent_projet_sportif, false)
     );
$$;

-- Le joueur connecté fait-il partie de cette équipe ?
CREATE FUNCTION public.pdj_joueur_dans_equipe(p_club_categorie_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM equipe_joueurs ej
     WHERE ej.club_categorie_id = p_club_categorie_id
       AND ej.joueur_id = auth.uid()
  );
$$;

-- Le parent connecté a-t-il un enfant (accès accepté) dans cette équipe ?
CREATE FUNCTION public.pdj_parent_enfant_dans_equipe(p_club_categorie_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM equipe_joueurs ej
     WHERE ej.club_categorie_id = p_club_categorie_id
       AND ej.joueur_id IS NOT NULL
       AND est_parent_accepte_de(ej.joueur_id)
  );
$$;

REVOKE ALL ON FUNCTION public.pdj_educateur_peut_ecrire(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pdj_joueur_dans_equipe(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pdj_parent_enfant_dans_equipe(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pdj_educateur_peut_ecrire(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pdj_joueur_dans_equipe(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pdj_parent_enfant_dans_equipe(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 3. Garde-fou de cohérence (équipe du même club, zone du même club et niveau)
-- ---------------------------------------------------------------------
CREATE FUNCTION public.pdj_coherence()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_zone record;
BEGIN
  IF NEW.club_categorie_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM club_categories cc
        WHERE cc.id = NEW.club_categorie_id AND cc.club_id = NEW.club_id) THEN
    RAISE EXCEPTION 'Cette équipe n''appartient pas à ce club.';
  END IF;

  -- terrain_zones n'a pas de zone_id : le test est imbriqué pour ne jamais le lire là-bas.
  IF TG_TABLE_NAME = 'principes_jeu' THEN
    IF NEW.zone_id IS NOT NULL THEN
      SELECT club_id, club_categorie_id INTO v_zone FROM terrain_zones WHERE id = NEW.zone_id;
      IF NOT FOUND
         OR v_zone.club_id <> NEW.club_id
         OR (v_zone.club_categorie_id IS NOT NULL
             AND v_zone.club_categorie_id IS DISTINCT FROM NEW.club_categorie_id) THEN
        RAISE EXCEPTION 'Cette zone ne peut pas être reliée à ce principe.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.pdj_coherence() FROM PUBLIC, anon;

CREATE TRIGGER pdj_coherence_principes
  BEFORE INSERT OR UPDATE OF club_id, club_categorie_id, zone_id ON public.principes_jeu
  FOR EACH ROW EXECUTE FUNCTION public.pdj_coherence();

CREATE TRIGGER pdj_coherence_zones
  BEFORE INSERT OR UPDATE OF club_id, club_categorie_id ON public.terrain_zones
  FOR EACH ROW EXECUTE FUNCTION public.pdj_coherence();

-- ---------------------------------------------------------------------
-- 4. Règles d'accès : principes_jeu
--    (club_gere_principes et verrou_outils ne sont pas touchées)
-- ---------------------------------------------------------------------
DROP POLICY educateur_gere_principes ON public.principes_jeu;
DROP POLICY joueur_lit_principes ON public.principes_jeu;
DROP POLICY parent_lit_principes ON public.principes_jeu;

CREATE POLICY educateur_lit_principes ON public.principes_jeu
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM club_educateurs ce
     WHERE ce.club_id = principes_jeu.club_id
       AND ce.educateur_id = auth.uid()
       AND ce.statut = 'accepte'));

CREATE POLICY educateur_ajoute_principes ON public.principes_jeu
  FOR INSERT TO authenticated
  WITH CHECK (pdj_educateur_peut_ecrire(club_id, club_categorie_id));

CREATE POLICY educateur_modifie_principes ON public.principes_jeu
  FOR UPDATE TO authenticated
  USING (pdj_educateur_peut_ecrire(club_id, club_categorie_id))
  WITH CHECK (pdj_educateur_peut_ecrire(club_id, club_categorie_id));

CREATE POLICY educateur_supprime_principes ON public.principes_jeu
  FOR DELETE TO authenticated
  USING (pdj_educateur_peut_ecrire(club_id, club_categorie_id));

CREATE POLICY joueur_lit_principes ON public.principes_jeu
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliations a
        JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
       WHERE a.joueur_id = auth.uid()
         AND a.statut = 'accepte'
         AND ce.club_id = principes_jeu.club_id
         AND ce.statut = 'accepte')
    AND (club_categorie_id IS NULL OR pdj_joueur_dans_equipe(club_categorie_id))
  );

CREATE POLICY parent_lit_principes ON public.principes_jeu
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliations a
        JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
       WHERE a.statut = 'accepte'
         AND est_parent_accepte_de(a.joueur_id)
         AND ce.club_id = principes_jeu.club_id
         AND ce.statut = 'accepte')
    AND (club_categorie_id IS NULL OR pdj_parent_enfant_dans_equipe(club_categorie_id))
  );

-- ---------------------------------------------------------------------
-- 5. Règles d'accès : terrain_zones (club_gere_zones n'est pas touchée)
-- ---------------------------------------------------------------------
DROP POLICY educateur_gere_zones ON public.terrain_zones;
DROP POLICY joueur_lit_zones ON public.terrain_zones;
DROP POLICY parent_lit_zones ON public.terrain_zones;

CREATE POLICY educateur_lit_zones ON public.terrain_zones
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM club_educateurs ce
     WHERE ce.club_id = terrain_zones.club_id
       AND ce.educateur_id = auth.uid()
       AND ce.statut = 'accepte'));

CREATE POLICY educateur_ajoute_zones ON public.terrain_zones
  FOR INSERT TO authenticated
  WITH CHECK (pdj_educateur_peut_ecrire(club_id, club_categorie_id));

CREATE POLICY educateur_modifie_zones ON public.terrain_zones
  FOR UPDATE TO authenticated
  USING (pdj_educateur_peut_ecrire(club_id, club_categorie_id))
  WITH CHECK (pdj_educateur_peut_ecrire(club_id, club_categorie_id));

CREATE POLICY educateur_supprime_zones ON public.terrain_zones
  FOR DELETE TO authenticated
  USING (pdj_educateur_peut_ecrire(club_id, club_categorie_id));

CREATE POLICY joueur_lit_zones ON public.terrain_zones
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliations a
        JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
       WHERE a.joueur_id = auth.uid()
         AND a.statut = 'accepte'
         AND ce.club_id = terrain_zones.club_id
         AND ce.statut = 'accepte')
    AND (club_categorie_id IS NULL OR pdj_joueur_dans_equipe(club_categorie_id))
  );

CREATE POLICY parent_lit_zones ON public.terrain_zones
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM affiliations a
        JOIN club_educateurs ce ON ce.educateur_id = a.educateur_id
       WHERE a.statut = 'accepte'
         AND est_parent_accepte_de(a.joueur_id)
         AND ce.club_id = terrain_zones.club_id
         AND ce.statut = 'accepte')
    AND (club_categorie_id IS NULL OR pdj_parent_enfant_dans_equipe(club_categorie_id))
  );

COMMIT;

SELECT 'Migration Plan de jeu terminée. Lancer maintenant supabase_plan_de_jeu_verification.sql' AS resultat;
