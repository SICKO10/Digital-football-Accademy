-- Liste les joueurs inscrits (validés) de tout le tournoi, par club — utilisé
-- par TournoiVote.jsx pour proposer un choix par numéro de maillot sur les
-- catégories individuelles (meilleur joueur/gardien) plutôt qu'une saisie
-- libre du nom. Même raison que trouver_joueur_inscrit_tournoi
-- (supabase_joueur_badges.sql) : SECURITY DEFINER, ne renvoie jamais
-- email/date_naissance publiquement — seul le strict nécessaire au vote.
CREATE OR REPLACE FUNCTION lister_roster_tournoi(p_tournoi_id UUID)
RETURNS TABLE (inscription_id UUID, nom_club TEXT, prenom TEXT, nom TEXT, numero_maillot INTEGER)
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT i.id, i.nom_club, j.prenom, j.nom, j.numero_maillot
  FROM tournois_inscriptions i
  JOIN tournois_inscriptions_joueurs j ON j.inscription_id = i.id
  WHERE i.tournoi_id = p_tournoi_id AND i.statut = 'validee'
  ORDER BY i.nom_club, j.numero_maillot NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION lister_roster_tournoi(UUID) TO anon, authenticated;
