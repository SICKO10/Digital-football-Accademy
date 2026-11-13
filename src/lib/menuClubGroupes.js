// Regroupement du menu du dashboard club : des entrées réunies en sous-onglets,
// comme « Mon équipe » ou « Organisation » côté éducateur.
// Module pur (sans React ni Supabase) : testé dans tests/menuClubGroupes.test.js.
// Les anciens identifiants d'écran (budget, sponsors, stages…) restent valables :
// un lien ou un raccourci qui les ouvre allume l'entrée parente.

export const GROUPES_CLUB = [
  { id: 'finance', label: 'Finance', zone: 'administratif', sousOnglets: ['budget', 'sponsors'] },
  { id: 'organisation', label: 'Organisation', zone: 'sportif', sousOnglets: ['deplacements', 'seances', 'terrains', 'inventaire'] },
  { id: 'evenements_sportifs', label: 'Événements sportifs', zone: 'sportif', sousOnglets: ['stages', 'tournoi'] },
]

// Étapes de « Mon club » dans leur ordre d'affichage. Staff et Organigramme y ont été
// déplacés : ils gardent leur propre permission, et un membre du bureau qui n'a que
// celles-là voit Mon club avec ces deux étapes seulement.
export const ETAPES_MON_CLUB = ['identite', 'staff', 'organigramme', 'bureau']
const ETAPES_REGLAGES = ['identite', 'bureau']

// Sous-pages de la rubrique « Configuration » : tout ce qui règle les outils.
// « forfait » est l'ancienne page Mes outils (abonnement, paiement).
export const ETAPES_CONFIGURATION = ['forfait', 'outils', 'educateurs', 'journal']

export function groupeDeLOnglet(ongletId) {
  return GROUPES_CLUB.find(g => g.sousOnglets.includes(ongletId)) || null
}

// Sous-onglets d'un groupe que le membre peut ouvrir (permission + outils du club).
export function sousOngletsAccessibles(groupe, accessible) {
  return groupe.sousOnglets.filter(accessible)
}

// Une entrée regroupée apparaît dès qu'un de ses sous-onglets est accessible,
// et s'ouvre sur le premier accessible. Rien d'accessible : pas d'entrée (null).
export function cibleDuGroupe(groupe, accessible) {
  return sousOngletsAccessibles(groupe, accessible)[0] || null
}

// Staff et Organigramme sont des étapes de Mon club : leurs anciens liens ouvrent Mon club.
export function entreeDeLOnglet(ongletId) {
  if (ongletId === 'staff' || ongletId === 'organigramme') return 'mon_club'
  return groupeDeLOnglet(ongletId)?.id || ongletId
}

export function etapeMonClubDeLOnglet(ongletId) {
  return ongletId === 'staff' || ongletId === 'organigramme' ? ongletId : null
}

// Étapes de Mon club visibles. Les réglages exigent le droit d'édition de « mon_club »,
// l'Accès du bureau reste réservé au président.
export function etapesMonClubVisibles({ peutReglages, estPresident, peutStaff, peutOrganigramme }) {
  return ETAPES_MON_CLUB.filter(id => {
    if (id === 'staff') return !!peutStaff
    if (id === 'organigramme') return !!peutOrganigramme
    if (id === 'bureau') return !!peutReglages && !!estPresident
    return ETAPES_REGLAGES.includes(id) && !!peutReglages
  })
}

export function monClubVisible(droits) {
  return etapesMonClubVisibles(droits).length > 0
}

// Sous-pages de Configuration visibles. Mon forfait suit le droit de la page Mes outils
// (et n'existe qu'en nouveau modèle) ; les trois réglages exigent le droit d'édition de
// « mon_club », comme avant dans Mon club.
export function etapesConfigurationVisibles({ peutReglages, peutForfait }) {
  return ETAPES_CONFIGURATION.filter(id => (id === 'forfait' ? !!peutForfait : !!peutReglages))
}

export function configurationVisible(droits) {
  return etapesConfigurationVisibles(droits).length > 0
}

// Ancien identifiant « mes_outils » : ouvre Configuration sur Mon forfait.
export function etapeConfigurationDeLOnglet(ongletId) {
  return ongletId === 'mes_outils' ? 'forfait' : null
}
