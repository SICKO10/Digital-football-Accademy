-- Le dashboard parent (DashboardParent.jsx) rend maintenant DashboardJoueur.jsx
-- lui-même avec joueurIdOverride : toutes les requêtes ciblent bien l'id de
-- l'ENFANT, mais la session authentifiée est celle du PARENT (auth.uid()).
-- Partout où une policy RLS vérifie "auth.uid() = joueur_id" (ou équivalent),
-- le parent est donc bloqué même si la requête demande la bonne ligne — d'où
-- le symptôme observé ("considéré non affilié" alors que affiliations
-- contient bien la ligne, simplement illisible pour ce rôle). Cette
-- migration ajoute, table par table, une policy SELECT permissive
-- supplémentaire pour un parent avec un accès accepté sur ce joueur — elle
-- s'AJOUTE aux policies existantes (RLS = OR entre policies permissives),
-- rien n'est retiré côté joueur/éducateur.

-- Fonction utilitaire (SECURITY DEFINER : doit pouvoir lire parents_acces
-- même si l'appelant, lui, n'a par ailleurs pas directement accès à cette
-- table pour un autre joueur_id).
CREATE OR REPLACE FUNCTION est_parent_accepte_de(p_joueur_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM parents_acces
    WHERE joueur_id = p_joueur_id
      AND parent_id = auth.uid()
      AND statut = 'accepte'
  );
$$;

-- Table, colonne portant l'id du joueur, nom de policy.
DO $$
DECLARE
  regles RECORD;
BEGIN
  FOR regles IN
    SELECT * FROM (VALUES
      ('affiliations', 'joueur_id'),
      ('certifications', 'joueur_id'),
      ('parcours', 'joueur_id'),
      ('reels', 'joueur_id'),
      ('demandes', 'joueur_id'),
      ('disponibilites', 'joueur_id'),
      ('stats_match', 'joueur_id'),
      ('notations_match', 'joueur_id'),
      ('notes_joueurs', 'joueur_id'),
      ('convocation_joueurs', 'joueur_id'),
      ('historique_saisons', 'joueur_id'),
      ('equipe_joueurs', 'joueur_id'),
      ('notifications', 'user_id'),
      ('notification_preferences', 'user_id'),
      ('equipement_tailles', 'user_id'),
      ('video_favoris', 'user_id'),
      ('equipement_commandes', 'destinataire_id')
    ) AS t(table_name, colonne)
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = regles.table_name)
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = regles.table_name AND column_name = regles.colonne) THEN
      EXECUTE format('DROP POLICY IF EXISTS "parent_lit_donnees_enfant" ON %I', regles.table_name);
      EXECUTE format(
        'CREATE POLICY "parent_lit_donnees_enfant" ON %I FOR SELECT USING (est_parent_accepte_de(%I))',
        regles.table_name, regles.colonne
      );
    ELSE
      RAISE NOTICE 'Ignoré (table ou colonne introuvable) : % . %', regles.table_name, regles.colonne;
    END IF;
  END LOOP;
END $$;

-- equipement_attributions : pas de colonne joueur_id directe, mais user_id.
DROP POLICY IF EXISTS "parent_lit_donnees_enfant" ON equipement_attributions;
CREATE POLICY "parent_lit_donnees_enfant" ON equipement_attributions
  FOR SELECT USING (est_parent_accepte_de(user_id));

-- messages : conversations privées joueur ↔ éducateur/coach. Inclus pour
-- correspondre à la demande ("le parent et l'enfant ne font qu'un"), mais à
-- reconsidérer si ce niveau de visibilité (contenu des messages, pas
-- seulement les stats/notes) n'est pas souhaité pour ce rôle.
DROP POLICY IF EXISTS "parent_lit_messages_enfant" ON messages;
CREATE POLICY "parent_lit_messages_enfant" ON messages
  FOR SELECT USING (est_parent_accepte_de(sender_id) OR est_parent_accepte_de(receiver_id));

-- presences_entrainement : clé sur equipe_joueurs.id (equipeJoueurId), pas
-- directement le profil du joueur — passe par affiliations pour retrouver
-- l'equipe_joueur_id du joueur consulté.
DROP POLICY IF EXISTS "parent_lit_presences_enfant" ON presences_entrainement;
CREATE POLICY "parent_lit_presences_enfant" ON presences_entrainement
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM affiliations
      WHERE affiliations.equipe_joueur_id = presences_entrainement.joueur_id
        AND est_parent_accepte_de(affiliations.joueur_id)
    )
  );
