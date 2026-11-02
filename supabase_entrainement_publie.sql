-- « Séance du jour » visible par les joueurs (BRIEF-entrainement.md,
-- PLAN-entrainement.md bloc 1). L'éducateur publie une copie figée des
-- procédés cochés de sa fiche (seances_uploadees.fiche_seance.procedes) à
-- des joueurs de son équipe active ; chaque joueur destinataire la voit
-- seulement le jour J, avant 22h heure de Paris. Après 22h la ligne reste en
-- base (archive éducateur) mais n'est plus lisible côté joueur.
--
-- Pourquoi une copie figée (colonne procedes) plutôt qu'un lien vers la
-- fiche : les procédés n'ont pas d'identifiant stable (le numéro change si
-- on en retire un) et un joueur ne peut pas lire seances_uploadees. Chaque
-- élément de procedes reprend les champs utiles du procédé (numero, titre,
-- duree, consignes, criteres_realisation, schema_png, et schema_data quand
-- le procédé vient de la bibliothèque).
--
-- Destinataires : les groupes choisis (équipe entière, postes, joueurs un
-- par un) sont gardés dans groupes pour réafficher la fenêtre de
-- publication, et résolus en une ligne par joueur dans
-- seances_publiees_destinataires au moment de publier (même calcul de poste
-- que l'app, getPosteFamille ; liste réutilisée par la notification).
--
-- Heure limite calculée en base (Europe/Paris), jamais sur le navigateur.

CREATE TABLE IF NOT EXISTS seances_publiees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  educateur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  club_categorie_id UUID NOT NULL REFERENCES club_categories(id) ON DELETE CASCADE,
  -- Entraînement supprimé = séance annulée : la publication disparaît aussi.
  entrainement_id UUID REFERENCES entrainements(id) ON DELETE CASCADE,
  fiche_id UUID REFERENCES seances_uploadees(id) ON DELETE SET NULL,
  date_seance DATE NOT NULL,
  heure TEXT,
  lieu TEXT,
  theme TEXT,
  procedes JSONB NOT NULL,
  groupes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Rien n'est publié sans au moins un procédé coché.
  CONSTRAINT seances_publiees_procedes_non_vide CHECK (
    CASE WHEN jsonb_typeof(procedes) = 'array' THEN jsonb_array_length(procedes) > 0 ELSE false END
  ),
  CONSTRAINT seances_publiees_groupes_valides CHECK (
    groupes <@ ARRAY['equipe', 'Gardien', 'Défenseur', 'Milieu', 'Attaquant', 'joueurs']::TEXT[]
  ),
  -- Une « Séance du jour » par équipe et par date : republier = modifier.
  CONSTRAINT seances_publiees_une_par_jour UNIQUE (club_categorie_id, date_seance)
);

CREATE TABLE IF NOT EXISTS seances_publiees_destinataires (
  publication_id UUID NOT NULL REFERENCES seances_publiees(id) ON DELETE CASCADE,
  joueur_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (publication_id, joueur_id)
);

CREATE INDEX IF NOT EXISTS idx_seances_publiees_educateur ON seances_publiees(educateur_id, date_seance);
CREATE INDEX IF NOT EXISTS idx_seances_publiees_destinataires_joueur ON seances_publiees_destinataires(joueur_id);

CREATE OR REPLACE FUNCTION seances_publiees_maj_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seances_publiees_updated_at ON seances_publiees;
CREATE TRIGGER trg_seances_publiees_updated_at BEFORE UPDATE ON seances_publiees
  FOR EACH ROW EXECUTE FUNCTION seances_publiees_maj_updated_at();

-- Fenêtre de visibilité joueur : le jour J à Paris, avant 22h00.
-- p_maintenant est paramétrable pour tester 21h59 / 22h01 sans attendre.
CREATE OR REPLACE FUNCTION seance_publiee_ouverte(p_date DATE, p_maintenant TIMESTAMPTZ DEFAULT now())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT p_date = (p_maintenant AT TIME ZONE 'Europe/Paris')::DATE
     AND (p_maintenant AT TIME ZONE 'Europe/Paris')::TIME < TIME '22:00';
$$;

-- Le joueur connecté est-il dans l'équipe de la publication ? Même
-- définition que le partage des schémas (supabase_tactipads_categorie_joueurs.sql) :
-- affiliation acceptée à cet éducateur, rattachée à cette équipe.
-- SECURITY DEFINER : évite que les règles des deux tables se lisent en
-- boucle, et le joueur n'a pas besoin de lire equipe_joueurs.
-- Ne répond que pour soi-même (joueur) ou pour son équipe (éducateur) :
-- un autre compte ne peut pas s'en servir pour sonder qui joue où.
CREATE OR REPLACE FUNCTION joueur_dans_equipe_publication(p_joueur_id UUID, p_educateur_id UUID, p_club_categorie_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (p_joueur_id = auth.uid() OR p_educateur_id = auth.uid())
  AND EXISTS (
    SELECT 1
    FROM affiliations a
    JOIN equipe_joueurs ej ON ej.id = a.equipe_joueur_id
    WHERE a.joueur_id = p_joueur_id
      AND a.educateur_id = p_educateur_id
      AND a.statut = 'accepte'
      AND ej.club_categorie_id = p_club_categorie_id
  );
$$;

CREATE OR REPLACE FUNCTION joueur_voit_seance_publiee(p_publication_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM seances_publiees p
    JOIN seances_publiees_destinataires d ON d.publication_id = p.id
    WHERE p.id = p_publication_id
      AND d.joueur_id = auth.uid()
      AND seance_publiee_ouverte(p.date_seance)
      AND joueur_dans_equipe_publication(auth.uid(), p.educateur_id, p.club_categorie_id)
  );
$$;

CREATE OR REPLACE FUNCTION educateur_possede_seance_publiee(p_publication_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM seances_publiees p
    WHERE p.id = p_publication_id AND p.educateur_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION joueur_dans_equipe_publication(UUID, UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION joueur_voit_seance_publiee(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION educateur_possede_seance_publiee(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION joueur_dans_equipe_publication(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION joueur_voit_seance_publiee(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION educateur_possede_seance_publiee(UUID) TO authenticated;

ALTER TABLE seances_publiees ENABLE ROW LEVEL SECURITY;
ALTER TABLE seances_publiees_destinataires ENABLE ROW LEVEL SECURITY;

-- seances_publiees : l'éducateur propriétaire fait tout sur ses lignes.
DROP POLICY IF EXISTS "seances_publiees_educateur_tout" ON seances_publiees;
CREATE POLICY "seances_publiees_educateur_tout" ON seances_publiees
  FOR ALL
  USING (educateur_id = auth.uid())
  WITH CHECK (educateur_id = auth.uid());

-- seances_publiees : le joueur lit seulement ce qui est publié pour lui,
-- aujourd'hui, avant 22h, et seulement s'il est encore dans l'équipe.
DROP POLICY IF EXISTS "seances_publiees_joueur_lecture" ON seances_publiees;
CREATE POLICY "seances_publiees_joueur_lecture" ON seances_publiees
  FOR SELECT
  USING (joueur_voit_seance_publiee(id));

-- Destinataires : l'éducateur gère la liste de ses publications, et ne peut
-- y mettre que des joueurs affiliés à son équipe de la publication.
DROP POLICY IF EXISTS "seances_publiees_destinataires_educateur_lecture" ON seances_publiees_destinataires;
CREATE POLICY "seances_publiees_destinataires_educateur_lecture" ON seances_publiees_destinataires
  FOR SELECT
  USING (educateur_possede_seance_publiee(publication_id));

DROP POLICY IF EXISTS "seances_publiees_destinataires_educateur_ajout" ON seances_publiees_destinataires;
CREATE POLICY "seances_publiees_destinataires_educateur_ajout" ON seances_publiees_destinataires
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM seances_publiees p
      WHERE p.id = publication_id
        AND p.educateur_id = auth.uid()
        AND joueur_dans_equipe_publication(joueur_id, p.educateur_id, p.club_categorie_id)
    )
  );

DROP POLICY IF EXISTS "seances_publiees_destinataires_educateur_retrait" ON seances_publiees_destinataires;
CREATE POLICY "seances_publiees_destinataires_educateur_retrait" ON seances_publiees_destinataires
  FOR DELETE
  USING (educateur_possede_seance_publiee(publication_id));

-- Destinataires : le joueur voit seulement sa propre ligne.
DROP POLICY IF EXISTS "seances_publiees_destinataires_joueur_lecture" ON seances_publiees_destinataires;
CREATE POLICY "seances_publiees_destinataires_joueur_lecture" ON seances_publiees_destinataires
  FOR SELECT
  USING (joueur_id = auth.uid());
