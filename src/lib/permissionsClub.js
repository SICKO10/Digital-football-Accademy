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
  // Page Mon club (personnalisation, outils, dashboard des éducateurs) : président seul
  // tant qu'il ne l'accorde pas à un rôle du bureau.
  mon_club: [],
  // Module Stages : géré par le club, son staff et ses éducateurs affiliés
  // (choix produit du 2026-10-24) — même liste reprise côté base dans
  // peut_gerer_stages() (supabase_stages_etape1.sql), à garder synchronisée.
  stages: ['president', 'directeur_sportif', 'secretaire'],
  // Bibliothèque du club : l'écriture est réservée au président et au directeur
  // sportif ; la lecture est plus large (voir LECTURE_PAR_DEFAUT). Même règle côté
  // base dans a_permission_bibliotheque() (supabase_bibliotheque_club.sql).
  bibliotheque: ['president', 'directeur_sportif'],
  // Fiches d'évaluation (supabase_fiches_evaluation_bloc1/2.sql, fonctions
  // a_permission_modeles_evaluation et a_permission_evaluations) : à garder
  // synchronisé avec elles. Modèles : écriture directeur sportif ; évaluations :
  // personne n'écrit par défaut ; tests : le préparateur physique écrit.
  evaluations_modeles: ['president', 'directeur_sportif'],
  evaluations: [],
  evaluations_tests: ['preparateur_physique'],
}

// Sections dont la lecture par défaut est plus large que l'écriture. 'tous' = tous
// les rôles du staff. Les autres sections n'apparaissent pas ici : pour elles,
// voir et écrire restent une seule et même liste (PERMISSION_DEFAULTS).
export const LECTURE_PAR_DEFAUT = {
  bibliotheque: 'tous',
  evaluations_modeles: ['directeur_sportif', 'responsable_formation', 'responsable_ecole_foot', 'responsable_preformation', 'entraineur', 'educateur', 'preparateur_physique'],
  evaluations: ['directeur_sportif', 'responsable_formation', 'responsable_ecole_foot', 'responsable_preformation'],
  evaluations_tests: ['directeur_sportif', 'responsable_formation', 'responsable_ecole_foot', 'responsable_preformation', 'preparateur_physique'],
}

// Le rôle voit-il la section tant que le président n'a rien réglé ?
export function voitParDefaut(section, role) {
  if (!role) return false
  const lecture = LECTURE_PAR_DEFAUT[section]
  if (lecture === 'tous') return true
  if (Array.isArray(lecture) && lecture.includes(role)) return true
  return (PERMISSION_DEFAULTS[section] || []).includes(role)
}

// Le rôle écrit-il dans la section tant que le président n'a rien réglé ?
export function ecritParDefaut(section, role) {
  return (PERMISSION_DEFAULTS[section] || []).includes(role)
}

// Même règle que canEditSection (DashboardClub.jsx) : le président a toujours
// tout ; sinon la ligne role_permissions explicite fait foi ; à défaut, la
// matrice par défaut.
export function peutEditerSection({ role, section, ligne }) {
  if (role === 'president') return true
  if (ligne) return !!(ligne.can_view && ligne.can_edit)
  return (PERMISSION_DEFAULTS[section] || []).includes(role)
}
