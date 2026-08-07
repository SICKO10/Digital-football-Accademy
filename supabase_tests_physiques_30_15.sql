-- Remplace le Yo-Yo IR1 (mètres) par le test 30-15 Intermittent Fitness Test
-- (résultat exprimé en VIFT, vitesse maximale théorique, km/h). La colonne
-- yoyo_ir1_m n'est pas supprimée (au cas où d'anciens tests y seraient déjà
-- enregistrés) — simplement plus utilisée par le formulaire/l'affichage.

alter table tests_physiques add column if not exists test_30_15_kmh numeric(4,1);
