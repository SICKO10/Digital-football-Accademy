-- affiliations n'avait aucune policy SELECT pour le club lui-même (seulement
-- educateur/joueur/parent) — ce qui cassait silencieusement toute policy
-- d'une AUTRE table dont la condition passe par une sous-requête sur
-- affiliations filtrée côté club (ex: profil_parent.club_lit_profils_parents,
-- utilisée par la modale "Parents rattachés" de l'organigramme). Confirmé en
-- simulant la session RLS réelle du club (SET LOCAL role authenticated +
-- request.jwt.claims), pas juste en lisant les données avec le rôle service
-- qui contourne RLS et masque ce genre de trou.
--
-- Fonction SECURITY DEFINER (comme est_parent_accepte_de ailleurs dans ce
-- projet) plutôt qu'une sous-requête directe sur club_educateurs : cette
-- dernière a elle-même une policy ("joueur_lit_club_de_son_educateur") qui
-- relit affiliations — un simple EXISTS(...) sans DEFINER provoque une
-- récursion infinie entre les deux tables (42P17), la fonction contourne
-- la RLS de club_educateurs pour cette vérification précise.
CREATE OR REPLACE FUNCTION club_gere_educateur(p_educateur_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM club_educateurs ce
    WHERE ce.educateur_id = p_educateur_id
      AND ce.statut = 'accepte'
      AND (
        ce.club_id = auth.uid()
        OR EXISTS (SELECT 1 FROM staff_club sc WHERE sc.club_id = ce.club_id AND sc.user_id = auth.uid())
      )
  );
$$;

DROP POLICY IF EXISTS "club_lit_affiliations_ses_educateurs" ON affiliations;
CREATE POLICY "club_lit_affiliations_ses_educateurs" ON affiliations
  FOR SELECT USING (club_gere_educateur(affiliations.educateur_id));
