-- Même rattrapage que pour "Nos tournois" (tournois_participation), mais
-- côté "On organise" (tournois_organises) : relie rétroactivement les
-- tournois existants dont la recette d'inscriptions ou le coût
-- d'organisation étaient déjà renseignés avant que la sync budget ne soit
-- en place, et n'ont donc jamais eu leur entrée budget_club correspondante.
INSERT INTO budget_club (club_id, type, categorie, libelle, montant, date, source_type, source_id)
SELECT club_id, 'recette', 'Tournoi', 'Inscriptions tournoi — ' || nom,
  COALESCE(prix_inscription_equipe, 0) * COALESCE(nb_equipes_payantes, 0), date, 'tournoi_organise', id
FROM tournois_organises t
WHERE COALESCE(prix_inscription_equipe, 0) * COALESCE(nb_equipes_payantes, 0) > 0
  AND NOT EXISTS (SELECT 1 FROM budget_club b WHERE b.source_type = 'tournoi_organise' AND b.source_id = t.id);

INSERT INTO budget_club (club_id, type, categorie, libelle, montant, date, source_type, source_id)
SELECT club_id, 'depense', 'Tournoi', 'Organisation tournoi — ' || nom, cout_organisation, date, 'tournoi_organise_cout', id
FROM tournois_organises t
WHERE COALESCE(cout_organisation, 0) > 0
  AND NOT EXISTS (SELECT 1 FROM budget_club b WHERE b.source_type = 'tournoi_organise_cout' AND b.source_id = t.id);
