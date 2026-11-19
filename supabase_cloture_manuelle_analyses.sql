-- Clôture manuelle des demandes d'analyse joueur et des séances transférées
-- (onglet Analyse Joueur / Analyse Séance de /coach) : permet de classer une
-- demande dans l'historique sans envoyer d'analyse (impayé, doublon, etc.).
-- Le statut existant ne change pas, donc rien ne bouge côté joueur ou club.
-- Colonne vide = pas clôturée. Ajout seul, aucune donnée modifiée.
alter table public.demandes add column if not exists cloture_manuelle_le timestamptz;
alter table public.seances_uploadees add column if not exists cloture_manuelle_le timestamptz;

-- La table demandes n'autorise la modification que de colonnes précises
-- (droits par colonne) : on ajoute la nouvelle. Seuls les admins coach peuvent
-- modifier une demande (règle admin_coach_gere_demandes), rien ne s'ouvre aux joueurs.
grant update (cloture_manuelle_le) on public.demandes to authenticated;
