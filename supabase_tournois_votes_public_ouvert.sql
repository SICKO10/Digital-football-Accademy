-- Vote public ouvert directement sur la page /tournoi/:code (onglet Votes),
-- accessible à n'importe quel visiteur sans lien privé ni inscription — en
-- plus du vote officiel par équipe déjà en place (TournoiVote.jsx, un vote
-- par inscription validée via UNIQUE(tournoi_id, inscription_id)).
--
-- inscription_id devient NULLABLE : les votes "grand public" l'insèrent à
-- NULL. Postgres traite chaque NULL comme distinct pour une contrainte
-- UNIQUE, donc la contrainte existante n'empêche pas plusieurs votes publics
-- sur le même tournoi — la seule protection contre les votes multiples
-- depuis un même navigateur est côté client (localStorage), assumé comme
-- un vote de type "sondage/public" plutôt qu'un scrutin à intégrité stricte.
ALTER TABLE tournois_votes ALTER COLUMN inscription_id DROP NOT NULL;

DROP POLICY IF EXISTS "tournois_votes_public_ouvert_insert" ON tournois_votes;
CREATE POLICY "tournois_votes_public_ouvert_insert" ON tournois_votes
  FOR INSERT
  WITH CHECK (
    inscription_id IS NULL
    AND EXISTS (SELECT 1 FROM tournois_organises t WHERE t.id = tournoi_id AND t.code_public IS NOT NULL)
  );
