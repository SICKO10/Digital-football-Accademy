// Catalogue des outils à la carte : seule source des noms, promesses, prix,
// clés Stripe et menus débloqués, pour les éducateurs et pour les clubs.
// Module pur, sans dépendance : utilisable côté navigateur et côté serveur.
//
// Décisions de Kevin (2026-11-07) :
// - socle éducateur : accueil, profil, effectif, compétition (sans les stats
//   collectives), calendrier, présences et taux de présence, organisation ;
// - socle club : accueil, profil, catégories et équipes, éducateurs, staff,
//   organigramme, inventaire, planning, séances, terrains, déplacements ;
// - CFF4 et Stages sont des outils payants ; l'éducateur affilié reçoit
//   Stages et CFF4 seulement si son club les a souscrits ;
// - Explorer et Recrutement sont retirés des menus pour le moment.
// Les prix restent à null tant que la grille n'est pas fournie (bloc 5).

export const ROLES = ['educateur', 'club']

// Ce qui reste gratuit. Les clés sont celles des menus des dashboards.
// `fonctions` : parties de page gratuites à l'intérieur d'un menu payant ou
// d'un menu découpé (à brancher aux blocs 3 et 4).
export const SOCLE = {
  educateur: {
    menus: ['accueil', 'profil', 'equipe', 'matchs', 'materiel', 'terrains', 'deplacements'],
    fonctions: ['calendrier', 'presences_joueurs', 'taux_presence'],
  },
  club: {
    menus: [
      'accueil', 'profil', 'categories', 'educateurs', 'staff', 'organigramme',
      'inventaire', 'planning', 'seances', 'terrains', 'deplacements',
    ],
    fonctions: [],
  },
}

// `viaClub` : l'éducateur affilié reçoit l'outil quand son club détient l'outil
// club indiqué. `achetable: false` : l'éducateur ne peut pas l'acheter seul.
const outil = (id, role, nom, promesse, menus, extra = {}) => ({
  id,
  role,
  nom,
  promesse,
  menus,
  prixMensuel: null,
  prixAnnuel: null,
  cleMensuel: `outil_${role}_${id}_mensuel`,
  cleAnnuel: `outil_${role}_${id}_annuel`,
  achetable: true,
  viaClub: null,
  ...extra,
})

export const OUTILS = [
  // Éducateur
  outil('suivi_joueurs', 'educateur', 'Suivi des joueurs', 'Statistiques, santé et historique de chaque joueur de ton équipe.', ['stats', 'sante', 'historique']),
  outil('seances', 'educateur', 'Séances', 'Prépare tes entraînements et retrouve toutes tes séances.', ['entrainements', 'mes_seances']),
  outil('tactique', 'educateur', 'Tactique', 'Tacticboard animé et bibliothèque de schémas.', ['tactipad', 'bibliotheque']),
  outil('prep_physique', 'educateur', 'Préparation physique', 'Programmes physiques adaptés à l\'âge de tes joueurs.', ['prep_physique']),
  outil('evaluations_video', 'educateur', 'Évaluations et vidéo', 'Rapports, notes, analyse vidéo et clôtures de saison.', ['analyse_video', 'notes', 'clotures_saison']),
  outil('projet_sportif', 'educateur', 'Projet sportif', 'Écris et suis le projet sportif de ton équipe.', ['projet_sportif'], { viaClub: 'projet_sportif' }),
  outil('cff4', 'educateur', 'Projet Club CFF4', 'Le parcours CFF4 du club, étape par étape.', ['projet_club_cff4'], { viaClub: 'cff4' }),
  outil('stages', 'educateur', 'Stages', 'Les stages du club, pour les éducateurs affiliés.', ['stages'], { achetable: false, viaClub: 'stages' }),
  // Club
  outil('competition', 'club', 'Compétition', 'Classements et tournois du club.', ['classements', 'tournoi']),
  outil('projet_sportif', 'club', 'Projet sportif', 'Le projet sportif du club, partagé avec ses éducateurs.', ['projet_sportif']),
  outil('finances', 'club', 'Finances et partenaires', 'Budget et sponsors du club.', ['budget', 'sponsors']),
  outil('vie_club', 'club', 'Vie du club', 'Événements, tâches et newsletter.', ['evenements', 'taches', 'newsletter']),
  outil('stages', 'club', 'Stages', 'Organise les stages et reçois les inscriptions.', ['stages']),
  outil('cff4', 'club', 'Projet Club CFF4', 'Le parcours CFF4 du club, étape par étape.', ['projet_club_cff4']),
]

export const outilsDuRole = (role) => OUTILS.filter(o => o.role === role)
export const trouverOutil = (role, id) => OUTILS.find(o => o.role === role && o.id === id) || null
export const outilsAchetables = (role) => outilsDuRole(role).filter(o => o.achetable)

// Trois questions à l'inscription (bloc 11).
export const QUESTIONS = [
  {
    id: 'q1',
    texte: 'Vous êtes ?',
    reponses: [
      { id: 'educateur_independant', texte: 'Éducateur indépendant' },
      { id: 'educateur_club', texte: 'Éducateur d\'un club' },
      { id: 'dirigeant_club', texte: 'Président ou dirigeant de club' },
    ],
  },
  {
    id: 'q2',
    texte: 'Quelle catégorie ?',
    reponses: [
      { id: 'ecole', texte: 'École de foot (U6 à U11)' },
      { id: 'u13_u15', texte: 'U13 à U15' },
      { id: 'u17_u19', texte: 'U17 à U19' },
      { id: 'seniors', texte: 'Seniors' },
    ],
  },
  {
    id: 'q3',
    texte: 'Votre priorité cette saison ?',
    reponses: [
      { id: 'seances', texte: 'Préparer mes séances' },
      { id: 'suivi', texte: 'Suivre mes joueurs' },
      { id: 'matchs', texte: 'Gérer matchs et compétition' },
      { id: 'organiser', texte: 'Organiser le club' },
    ],
  },
]

const PRECOCHAGE = {
  educateur: {
    q3: {
      seances: ['seances', 'tactique'],
      suivi: ['suivi_joueurs', 'evaluations_video'],
      matchs: ['tactique'],
      organiser: [],
    },
    q2: {
      ecole: ['projet_sportif'],
      u13_u15: ['prep_physique'],
      u17_u19: ['prep_physique', 'evaluations_video'],
      seniors: ['prep_physique', 'evaluations_video'],
    },
  },
  club: {
    q3: {
      seances: [],
      suivi: [],
      matchs: ['competition'],
      organiser: ['vie_club'],
    },
    q2: {
      ecole: ['projet_sportif'],
      u13_u15: [],
      u17_u19: [],
      seniors: [],
    },
  },
}

// Outils pré-cochés d'après les réponses. Le client peut tout décocher.
// `fournisParLeClub` : ids d'outils déjà donnés par le club (éducateur affilié),
// jamais pré-cochés puisqu'ils sont déjà inclus.
export function outilsPrecoches(role, reponses = {}, fournisParLeClub = []) {
  const table = PRECOCHAGE[role]
  if (!table) return []
  const ids = new Set([
    ...(table.q3[reponses.q3] || []),
    ...(table.q2[reponses.q2] || []),
  ])
  return outilsAchetables(role)
    .filter(o => ids.has(o.id) && !fournisParLeClub.includes(o.id))
    .map(o => o.id)
}

const ts = (d) => (d ? new Date(d).getTime() : NaN)

// Un droit sur un outil est actif quand :
// - statut 'actif' : abonnement en cours ;
// - statut 'essai' : essai gratuit non expiré (essaiFin) ;
// - statut 'retire' : outil retiré mais encore payé jusqu'à la fin de période (periodeFin).
export function droitActif(droit, maintenant = new Date()) {
  if (!droit) return false
  const now = ts(maintenant)
  if (droit.statut === 'actif') return true
  if (droit.statut === 'essai') return ts(droit.essaiFin) > now
  if (droit.statut === 'retire') return ts(droit.periodeFin) > now
  return false
}

// Calcule les outils visibles.
// compte : { role, modeleOutils, droits: [{outil, statut, essaiFin?, periodeFin?}],
//            clubOutils?: ids des outils actifs du club affilié (éducateur affilié) }
// Retourne null quand le compte n'est pas au nouveau modèle : aucun filtrage.
export function outilsVisibles(compte, maintenant = new Date()) {
  if (!compte || !compte.modeleOutils) return null
  const { role, droits = [], clubOutils = [] } = compte
  const visibles = new Set()
  for (const d of droits) {
    const o = trouverOutil(role, d.outil)
    if (o && droitActif(d, maintenant)) visibles.add(o.id)
  }
  if (role === 'educateur') {
    for (const o of outilsDuRole('educateur')) {
      if (o.viaClub && clubOutils.includes(o.viaClub)) visibles.add(o.id)
    }
  }
  return [...visibles]
}

// Entrées de menu visibles : socle toujours, outil seulement s'il est visible.
// `menus` : liste des clés de menu telle que le dashboard la connaît. Une clé
// absente du catalogue (Explorer par exemple) est retirée. Si le compte n'est
// pas au nouveau modèle, la liste est rendue telle quelle.
export function menuFiltre(compte, menus, maintenant = new Date()) {
  const visibles = outilsVisibles(compte, maintenant)
  if (visibles === null) return menus
  const role = compte.role
  const autorisees = new Set(SOCLE[role]?.menus || [])
  for (const id of visibles) {
    for (const m of trouverOutil(role, id)?.menus || []) autorisees.add(m)
  }
  return menus.filter(m => autorisees.has(typeof m === 'string' ? m : m.id ?? m.key))
}

// Total d'une composition. Retourne null tant qu'un prix manque : on n'affiche
// jamais un total faux.
export function totalComposition(role, ids, periodicite) {
  const champ = periodicite === 'annuel' ? 'prixAnnuel' : 'prixMensuel'
  let total = 0
  for (const id of ids) {
    const o = trouverOutil(role, id)
    if (!o || !o.achetable || typeof o[champ] !== 'number') return null
    total += o[champ]
  }
  return total
}

// Jours entiers restants d'un essai (arrondi au-dessus), 0 si expiré ou absent.
export function joursRestantsEssai(essaiFin, maintenant = new Date()) {
  const reste = ts(essaiFin) - ts(maintenant)
  if (!(reste > 0)) return 0
  return Math.ceil(reste / 86400000)
}

// Garde-fou de la bascule (bloc 16) : outils achetables sans prix complet.
export function outilsSansPrix() {
  return OUTILS.filter(o => o.achetable && (typeof o.prixMensuel !== 'number' || typeof o.prixAnnuel !== 'number'))
    .map(o => `${o.role}/${o.id}`)
}
