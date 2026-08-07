-- RLS pour tests_physiques (colonnes réelles confirmées : id, joueur_id,
-- educateur_id, club_id, date_test, cmj_cm, sprint_10m_s, sprint_30m_s,
-- yoyo_ir1_m, notes, created_at). tests_physiques.joueur_id référence
-- profiles(id) directement (confirmé par l'embed déjà utilisé dans le code :
-- joueur:profiles!joueur_id(id, nom, prenom)) — PAS equipe_joueurs.id, donc
-- pas besoin de passer par affiliations/equipe_joueurs pour vérifier
-- l'identité du joueur, contrairement à la policy proposée initialement
-- (qui comparait equipe_joueurs.email à profiles.email — equipe_joueurs.email
-- n'est qu'un champ d'invitation, pas fiable une fois le compte lié, et de
-- toute façon inutile ici puisque joueur_id = auth.uid() directement).

alter table tests_physiques enable row level security;

drop policy if exists "educateur_full" on tests_physiques;
drop policy if exists "joueur_read_only" on tests_physiques;

-- Éducateur : accès complet sur les tests qu'il a lui-même créés.
create policy "educateur_full_tests_physiques"
  on tests_physiques for all
  using (auth.uid() = educateur_id)
  with check (auth.uid() = educateur_id);

-- Joueur : lecture seule de ses propres tests.
create policy "joueur_read_tests_physiques"
  on tests_physiques for select
  using (auth.uid() = joueur_id);

grant select, insert, update, delete on tests_physiques to authenticated;
