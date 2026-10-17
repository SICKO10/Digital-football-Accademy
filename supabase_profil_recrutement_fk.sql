-- Moteur de recrutement : la page joint profil_recrutement à profiles, mais
-- aucun lien (clé étrangère) n'existait entre les deux tables — la requête
-- échouait systématiquement (PGRST200), la page restait vide depuis sa
-- création. Ajout du lien (table vide au moment de l'ajout, aucun orphelin),
-- avec suppression en cascade : un profil de recrutement disparaît avec le
-- compte du joueur. Puis rechargement du cache de schéma de l'API.
alter table public.profil_recrutement
  add constraint profil_recrutement_joueur_id_fkey
  foreign key (joueur_id) references public.profiles(id) on delete cascade;
notify pgrst, 'reload schema';
