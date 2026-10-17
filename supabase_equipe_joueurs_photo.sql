-- Photo d'un joueur ajoutée par son éducateur (dashboard éducateur > Mon
-- équipe > Modifier un joueur). Affichée en priorité sur la photo du compte
-- du joueur (profiles.avatar_url, lue via profiles_public), puis initiales.
-- Additif et sans risque : une colonne texte nullable, aucune donnée modifiée,
-- aucun droit changé (les éducateurs modifient déjà leurs lignes equipe_joueurs).
alter table public.equipe_joueurs add column if not exists photo_url text;
