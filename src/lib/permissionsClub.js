// Matrice d'accès par défaut aux sections du dashboard club, partagée entre
// le navigateur (DashboardClub.jsx) et le serveur (api/upload-image.js) pour
// qu'une seule source fasse foi. Module sans dépendance.
//
// Comportement avant toute configuration explicite par le président (aucune ligne
// en base pour ce club/rôle/section) — reproduit les règles d'accès qui existaient
// avant ce système, pour ne rien casser pour les clubs déjà en production. Section
// toute nouvelle (evenements) : pas de règle historique à préserver, donc personne
// d'autre que le président n'y a accès tant qu'il ne l'accorde pas explicitement.
export const PERMISSION_DEFAULTS = {
  sportif: ['president', 'directeur_sportif'],
  seances: ['president', 'directeur_sportif'],
  terrains: ['president', 'directeur_sportif'],
  deplacements: ['president', 'marketing', 'secretaire'],
  budget: ['president', 'secretaire'],
  sponsors: ['president', 'marketing', 'secretaire'],
  profil: ['president', 'marketing', 'secretaire'],
  evenements: [],
  organigramme: [],
  staff: [],
  inventaire: [],
  newsletter: [],
  taches: [],
  projet_club_cff4: [],
}

// Même règle que canEditSection (DashboardClub.jsx) : le président a toujours
// tout ; sinon la ligne role_permissions explicite fait foi ; à défaut, la
// matrice par défaut.
export function peutEditerSection({ role, section, ligne }) {
  if (role === 'president') return true
  if (ligne) return !!(ligne.can_view && ligne.can_edit)
  return (PERMISSION_DEFAULTS[section] || []).includes(role)
}
