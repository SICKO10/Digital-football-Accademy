-- Moteur de recrutement (Mon Réseau > Recrutement, éducateur + club) :
-- le joueur choisit s'il apparaît (visible_recruteurs) et son statut
-- (statut_recrutement), profil_recrutement contient déjà les moyennes
-- agrégées tenues à jour par MesStats.jsx à chaque saisie de match.
alter table profil_recrutement
  add column if not exists visible_recruteurs boolean not null default false,
  add column if not exists statut_recrutement text not null default 'Non disponible';

-- Un éducateur/club peut lire les profils que le joueur a rendus visibles —
-- la policy existante ("joueur_gere_son_profil_recrutement", for all) reste
-- pour que le joueur garde la main sur ses propres données ; celle-ci
-- s'ajoute pour le côté recruteur, en lecture seule.
create policy "staff_lit_profils_recrutement_visibles" on profil_recrutement for select
  using (
    visible_recruteurs = true
    and exists (select 1 from profiles p where p.id = auth.uid() and p.plan in ('educateur', 'club'))
  );

-- Détail "5 derniers matchs" du moteur de recrutement : lecture des stats
-- brutes d'un joueur, mais seulement s'il s'est rendu visible aux recruteurs
-- (même condition que ci-dessus, jamais un accès plus large).
create policy "staff_lit_stats_joueurs_visibles" on stats_match_joueur for select
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.plan in ('educateur', 'club'))
    and exists (select 1 from profil_recrutement pr where pr.joueur_id = stats_match_joueur.joueur_id and pr.visible_recruteurs = true)
  );
