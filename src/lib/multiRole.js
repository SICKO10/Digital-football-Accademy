import { supabase } from '../supabase'

// Rôles secondaires d'un compte, par relation — en plus de son plan
// principal (profiles.plan, jamais modifié par ces relations, cf. 341b631).
// Centralisé ici car utilisé à la fois par SmartDashboard (App.jsx, choix
// du dashboard après connexion) et par chaque dashboard (boutons "Vue
// Club/Éducateur/Parent/Joueur" pour basculer entre tous les rôles d'un
// même compte sans se reconnecter) — avant ce fichier, la même détection
// était dupliquée différemment dans DashboardEducateur.jsx et
// DashboardParent.jsx, et incomplète partout ailleurs (DashboardClub.jsx
// n'affichait qu'un seul rôle secondaire à la fois, DashboardJoueur.jsx
// aucun).
export async function chargerMesRoles(userId) {
  const [{ data: profil }, { data: staff }, { data: clubEduc }, { data: parentAcc }, { data: affiliation }] = await Promise.all([
    supabase.from('profiles').select('plan').eq('id', userId).maybeSingle(),
    supabase.from('staff_club').select('club_id, profiles!staff_club_club_id_fkey(club)').eq('user_id', userId).maybeSingle(),
    supabase.from('club_educateurs').select('id').eq('educateur_id', userId).eq('statut', 'accepte').maybeSingle(),
    supabase.from('parents_acces').select('joueur_id').eq('parent_id', userId).eq('statut', 'accepte').maybeSingle(),
    supabase.from('affiliations').select('id').eq('joueur_id', userId).eq('statut', 'accepte').maybeSingle(),
  ])
  const plan = profil?.plan

  let parentJoueurNom = null
  if (parentAcc?.joueur_id) {
    const { data: j } = await supabase.from('profiles').select('prenom, nom').eq('id', parentAcc.joueur_id).maybeSingle()
    parentJoueurNom = j ? `${j.prenom || ''} ${j.nom || ''}`.trim() : null
  }

  return {
    club: plan === 'club' || !!staff,
    clubNom: staff?.profiles?.club || null,
    educateur: plan === 'educateur' || !!clubEduc,
    joueur: ['fan', 'joueur_pro', 'joueur_starter', 'starter'].includes(plan) || !!affiliation,
    parent: !!parentAcc,
    parentJoueurId: parentAcc?.joueur_id || null,
    parentJoueurNom,
  }
}
