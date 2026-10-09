import { clientServiceSupabase } from './_securite.js'
import { peutEditerSection } from '../src/lib/permissionsClub.js'

// Vérifications de droits côté serveur, partagées par les endpoints
// (upload-image, ia). Lectures seules via la clé service. Les règles
// reproduisent celles des dashboards (cf. commentaires) : aucune ne donne
// plus d'accès que l'interface actuelle.

// Accès aux données (injectable pour les tests). Toute erreur Supabase est
// remontée => l'appelant répond 500, jamais un accès accordé par défaut.
export function donneesSupabase() {
  const lire = async (requete) => {
    const { data, error } = await requete
    if (error) throw error
    return data
  }
  const db = () => clientServiceSupabase()
  return {
    profil: (id) => lire(db().from('profiles').select('plan, abonnement_actif, educateurs_editent_projet_sportif').eq('id', id).maybeSingle()),
    staffClub: (userId, clubId) => lire(db().from('staff_club').select('role').eq('user_id', userId).eq('club_id', clubId).maybeSingle()),
    permissionRole: (clubId, role, section) => lire(db().from('role_permissions').select('can_view, can_edit').eq('club_id', clubId).eq('role', role).eq('section', section).maybeSingle()),
    affiliationEducateur: (userId, clubId) => lire(db().from('club_educateurs').select('peut_editer_projet_sportif').eq('educateur_id', userId).eq('club_id', clubId).eq('statut', 'accepte').maybeSingle()),
    affiliationEducateurAcceptee: async (userId) => !!(await lire(db().from('club_educateurs').select('id').eq('educateur_id', userId).eq('statut', 'accepte').limit(1).maybeSingle())),
    parentAccepte: async (parentId, joueurId) => !!(await lire(db().from('parents_acces').select('id').eq('parent_id', parentId).eq('joueur_id', joueurId).eq('statut', 'accepte').maybeSingle())),
    delegationDirigeant: (dirigeantId) => lire(db().from('dirigeant_acces').select('educateur_id').eq('dirigeant_id', dirigeantId).eq('statut', 'accepte').maybeSingle()),
  }
}

// Droit d'éditer une section d'un club — même règle que canEditSection
// (DashboardClub.jsx) : le club lui-même ; un membre staff_club selon la
// matrice role_permissions / PERMISSION_DEFAULTS (rôle absent => président) ;
// et, si educateursProjet, un éducateur affilié autorisé par le club ou par
// son override (Projet Sportif, cf. ProjetSportifEducateur.jsx).
export async function peutEditerPourClub({ donnees, userId, clubId, section, educateursProjet = false }) {
  if (userId === clubId) {
    const club = await donnees.profil(clubId)
    if (club?.plan === 'club') return true
  }
  const staff = await donnees.staffClub(userId, clubId)
  if (staff) {
    const role = staff.role || 'president'
    const ligne = role === 'president' ? null : await donnees.permissionRole(clubId, role, section)
    if (peutEditerSection({ role, section, ligne })) return true
  }
  if (educateursProjet) {
    const aff = await donnees.affiliationEducateur(userId, clubId)
    if (aff) {
      const club = await donnees.profil(clubId)
      if (aff.peut_editer_projet_sportif ?? club?.educateurs_editent_projet_sportif ?? false) return true
    }
  }
  return false
}

// Recruteur : même condition que DashboardRecruteur.jsx (plan 'scout') +
// le paywall du même dashboard (abonnement_actif).
export async function estRecruteurActif({ donnees, userId }) {
  const p = await donnees.profil(userId)
  return p?.plan === 'scout' && !!p.abonnement_actif
}

// Éducateur : même condition que DashboardEducateur.jsx — accès si plan
// 'educateur' avec abonnement actif, OU affiliation acceptée à un club
// (c'est alors le club qui paie, cf. clubAffilieAccepte). Un dirigeant
// délégué (dirigeant_acces accepté, cf. DashboardDirigeant.jsx) agit pour
// son éducateur, à condition que celui-ci soit lui-même éligible — comme
// dans l'interface, qui ne rattache aucune clé de permission aux outils IA.
async function educateurEligible({ donnees, educateurId }) {
  const p = await donnees.profil(educateurId)
  if (p?.plan === 'educateur' && p.abonnement_actif) return true
  return donnees.affiliationEducateurAcceptee(educateurId)
}

export async function peutUtiliserOutilsEducateur({ donnees, userId }) {
  if (await educateurEligible({ donnees, educateurId: userId })) return true
  const delegation = await donnees.delegationDirigeant(userId)
  return !!(delegation?.educateur_id && await educateurEligible({ donnees, educateurId: delegation.educateur_id }))
}

export const estUuid = (v) => typeof v === 'string' && /^[0-9a-f-]{8,64}$/i.test(v)
