-- La lecture des procédés partagés "Digital Football" (partage_platform,
-- cf. supabase_bibliotheque_visibilite_multiple.sql) ne vérifiait que
-- profiles.plan = 'educateur' — ratant les comptes qui ont accès au
-- dashboard éducateur via club_educateurs (ex. un président de club qui
-- s'auto-invite comme éducateur de son propre club, cas réel : Maxime
-- Lafay, plan='club') plutôt que via un plan 'educateur' payant. Résultat :
-- l'onglet "Digital Football" de la bibliothèque restait vide pour ces
-- comptes, sans erreur visible (RLS filtre silencieusement). Même classe
-- de bug déjà corrigée ailleurs cette session (DashboardEducateur.jsx,
-- App.jsx/SmartDashboard, envoyer-invitation) — club_educateurs accepté
-- traité comme preuve d'accès éducateur alternative au plan.

drop policy if exists "lecture_exercices" on bibliotheque_exercices;
create policy "lecture_exercices" on bibliotheque_exercices
  for select using (
    auth.uid() = educateur_id
    or (
      partage_club and club_id is not null and exists (
        select 1 from club_educateurs ce
        where ce.club_id = bibliotheque_exercices.club_id and ce.educateur_id = auth.uid() and ce.statut = 'accepte'
      )
    )
    or (
      partage_platform and (
        exists (select 1 from profiles p where p.id = auth.uid() and p.plan = 'educateur')
        or exists (select 1 from club_educateurs ce where ce.educateur_id = auth.uid() and ce.statut = 'accepte')
      )
    )
  );
