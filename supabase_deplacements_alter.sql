-- Ajoute l'heure de retour estimée et le nombre de personnes (joueurs + staff)
-- à un déplacement — nécessaire à l'algorithme de répartition mini-bus, qui a
-- besoin de savoir quand un bus redevient disponible et combien de places il
-- lui faut.
alter table deplacements add column if not exists heure_retour_estimee time;
alter table deplacements add column if not exists nb_personnes integer;
