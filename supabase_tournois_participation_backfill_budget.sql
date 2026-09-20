-- Rattrapage : jusqu'ici seul le champ "Inscription" du budget d'un tournoi
-- (onglet Logistique, "Nos tournois") créait une dépense dans budget_club —
-- "Transport" et "Hébergement" étaient enregistrés sur le tournoi mais
-- jamais reliés au budget. Ce script relie rétroactivement tous les
-- tournois existants dont un de ces 3 montants est renseigné et n'a pas
-- encore sa dépense correspondante.
INSERT INTO budget_club (club_id, type, categorie, libelle, montant, date, source_type, source_id)
SELECT club_id, 'depense', 'Tournoi', 'Inscription tournoi — ' || nom, budget_inscription, date_debut, 'tournoi_participation', id
FROM tournois_participation t
WHERE COALESCE(budget_inscription, 0) > 0
  AND NOT EXISTS (SELECT 1 FROM budget_club b WHERE b.source_type = 'tournoi_participation' AND b.source_id = t.id);

INSERT INTO budget_club (club_id, type, categorie, libelle, montant, date, source_type, source_id)
SELECT club_id, 'depense', 'Tournoi', 'Transport tournoi — ' || nom, budget_transport, date_debut, 'tournoi_participation_transport', id
FROM tournois_participation t
WHERE COALESCE(budget_transport, 0) > 0
  AND NOT EXISTS (SELECT 1 FROM budget_club b WHERE b.source_type = 'tournoi_participation_transport' AND b.source_id = t.id);

INSERT INTO budget_club (club_id, type, categorie, libelle, montant, date, source_type, source_id)
SELECT club_id, 'depense', 'Tournoi', 'Hébergement tournoi — ' || nom, budget_hebergement, date_debut, 'tournoi_participation_hebergement', id
FROM tournois_participation t
WHERE COALESCE(budget_hebergement, 0) > 0
  AND NOT EXISTS (SELECT 1 FROM budget_club b WHERE b.source_type = 'tournoi_participation_hebergement' AND b.source_id = t.id);
