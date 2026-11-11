// Catalogue des outils à la carte : seule source des noms, promesses, prix,
// clés Stripe et menus débloqués, pour les éducateurs et pour les clubs.
// Module pur, sans dépendance : utilisable côté navigateur et côté serveur.
//
// Décisions de Kevin (2026-11-07) :
// - socle éducateur : accueil, profil, effectif, compétition (sans les stats
//   collectives), calendrier, planification des séances (Planning, onglet
//   `entrainements`), présences et taux de présence, organisation ;
// - socle club : accueil, profil, catégories et équipes, éducateurs, staff,
//   organigramme, inventaire, planning, séances, terrains, déplacements ;
// - CFF4 et Stages sont des outils payants ; l'éducateur affilié reçoit
//   Stages et CFF4 seulement si son club les a souscrits ;
// - Explorer et Recrutement sont retirés des menus pour le moment.
// Prix en euros par mois et par an. Les outils d'un club n'ont pas de prix : ils sont
// inclus dans le forfait selon les équipes (`inclus`), le club les choisit librement.

export const ROLES = ['educateur', 'club']

// Ce qui reste gratuit. Les clés sont celles des menus des dashboards.
// `fonctions` : parties de page gratuites à l'intérieur d'un menu payant ou
// d'un menu découpé (à brancher aux blocs 3 et 4).
export const SOCLE = {
  educateur: {
    menus: ['accueil', 'profil', 'mes_outils', 'equipe', 'matchs', 'entrainements', 'materiel', 'terrains', 'deplacements', 'clotures_saison'],
    fonctions: ['calendrier', 'presences_joueurs', 'taux_presence'],
  },
  club: {
    menus: [
      'accueil', 'profil', 'mes_outils', 'categories', 'educateurs', 'staff', 'organigramme',
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
  inclus: role === 'club',
  cleMensuel: `outil_${role}_${id}_mensuel`,
  cleAnnuel: `outil_${role}_${id}_annuel`,
  achetable: true,
  viaClub: null,
  ...extra,
})

// Durée de l'essai gratuit d'un outil éducateur, en jours.
export const ESSAI_JOURS = 14

// Interrupteur des essais gratuits : suspendus pour le moment (décision du
// 2026-11-10). Passer à true les rallume (bouton « Essayer » et action `essai`).
export const ESSAIS_GRATUITS = false

const prix = (mensuel, annuel) => ({ prixMensuel: mensuel, prixAnnuel: annuel })

export const OUTILS = [
  // Éducateur
  outil('suivi_joueurs', 'educateur', 'Suivi des joueurs', 'Statistiques, santé, historique et fiche d\'évaluation de chaque joueur de ton équipe.', ['stats', 'sante', 'historique', 'notes'], prix(1, 10)),
  // Stats collectives : pas d'entrée de menu à part, ce sont des parties de pages
  // (onglet Graphiques, Bilan de l'équipe avec buts par quart d'heure et nature
  // des buts, scan de la feuille de match). Branchées dans DashboardEducateur.
  outil('stats_collectives', 'educateur', 'Stats collectives', 'Graphiques de l\'équipe, buts par quart d\'heure, nature des buts et scan de la feuille de match.', [], prix(1, 10)),
  outil('seances', 'educateur', 'Séances', 'Rédige, scanne et imprime tes fiches de séance, et retrouve-les toutes.', ['mes_seances'], prix(3, 30)),
  outil('tactique', 'educateur', 'Tacticboard', 'Dessine et anime tes schémas tactiques.', ['tactipad'], prix(4, 40)),
  outil('bibliotheque', 'educateur', 'Bibliothèque', 'Ta bibliothèque de schémas, à retrouver et réutiliser.', ['bibliotheque'], prix(4, 40)),
  outil('prep_physique', 'educateur', 'Préparation physique', 'Programmes physiques adaptés à l\'âge de tes joueurs.', ['prep_physique'], prix(2, 20)),
  outil('evaluations_video', 'educateur', 'Analyse vidéo', 'Analyse vidéo de tes matchs et de tes joueurs.', ['analyse_video'], prix(2, 20)),
  outil('projet_sportif', 'educateur', 'Projet sportif', 'Écris et suis le projet sportif de ton équipe.', ['projet_sportif'], { ...prix(2, 20), viaClub: 'projet_sportif' }),
  outil('cff4', 'educateur', 'Projet Club CFF4', 'Le parcours CFF4 du club, étape par étape.', ['projet_club_cff4'], { ...prix(2, 20), viaClub: 'cff4' }),
  outil('stages', 'educateur', 'Stages', 'Les stages du club, pour les éducateurs affiliés.', ['stages'], { achetable: false, viaClub: 'stages' }),
  // Club
  outil('competition', 'club', 'Compétition', 'Classements et tournois du club.', ['classements', 'tournoi']),
  outil('projet_sportif', 'club', 'Projet sportif', 'Le projet sportif du club, partagé avec ses éducateurs.', ['projet_sportif']),
  outil('finances', 'club', 'Finances et partenaires', 'Budget et sponsors du club.', ['budget', 'sponsors']),
  outil('vie_club', 'club', 'Vie du club', 'Événements, tâches et newsletter.', ['evenements', 'taches', 'newsletter']),
  outil('stages', 'club', 'Stages', 'Organise les stages et reçois les inscriptions.', ['stages']),
  outil('cff4', 'club', 'Projet Club CFF4', 'Le parcours CFF4 du club, étape par étape.', ['projet_club_cff4']),
]

// Forfaits club selon le nombre d'équipes : mêmes montants que les liens de
// paiement actuels (src/lib/stripeLinks.js, STRIPE_LINKS_CLUB). `palier` est la
// clé de ces liens et de PALIERS_QUOTA_EQUIPES ; le webhook des outils s'en sert
// au bloc 7 pour recalculer le quota d'équipes. Annuel = 10 mois.
const forfait = (palier, equipes, mensuel, annuel) => ({
  id: palier,
  palier,
  equipes,
  nom: `Forfait club jusqu'à ${equipes} équipes`,
  prixMensuel: mensuel,
  prixAnnuel: annuel,
  cleMensuel: `forfait_club_${palier}_mensuel`,
  cleAnnuel: `forfait_club_${palier}_annuel`,
})

export const FORFAITS_CLUB = [
  forfait('c0', 2, 50, 500),
  forfait('c100', 4, 100, 1000),
  forfait('c200', 7, 130, 1300),
  forfait('c300', 11, 160, 1600),
  forfait('c400', 15, 190, 1900),
  forfait('c500', 22, 250, 2500),
]

// Paliers de l'éducateur (décision du 2026-11-11, remplace les prix à l'unité) :
// il choisit ses outils et paie selon leur nombre, le socle gratuit en plus.
// À partir de 7 outils, le palier « tous les outils » les donne les 9
// (les outils fournis par le club, comme Stages, n'en font pas partie).
// Un palier = un tarif Stripe mensuel et un annuel, retrouvés par leur clé de
// recherche ; les outils choisis voyagent dans les métadonnées du paiement.
const palier = (id, max, nom, mensuel, annuel, cle) => ({
  id, max, nom, prixMensuel: mensuel, prixAnnuel: annuel, cleMensuel: `${cle}_mensuel`, cleAnnuel: `${cle}_annuel`,
})
export const PALIERS_EDUCATEUR = [
  palier('3', 3, 'Outils éducateur : jusqu\'à 3 outils', 10, 80, 'pack_educateur_3'),
  palier('6', 6, 'Outils éducateur : jusqu\'à 6 outils', 15, 120, 'pack_educateur_6'),
  // 18 € par mois : une saison dure 10 mois, donc 10 mensualités (180 €) coûtent plus que l'année (150 €).
  palier('9', 9, 'Tous les outils éducateur', 18, 150, 'pack_educateur'),
]
export const PACK_EDUCATEUR = PALIERS_EDUCATEUR[2]

// Identifiants des outils compris dans le palier « tous les outils ».
export const outilsDuPack = () => outilsAchetables('educateur').filter(o => !o.inclus).map(o => o.id)

// Palier qui couvre ce nombre d'outils (null pour 0 ou plus de 9).
export const palierPourNombre = (n) => (n >= 1 ? PALIERS_EDUCATEUR.find(p => n <= p.max) || null : null)

// Tout ce qui existe dans Stripe : un produit par palier éducateur et par
// forfait club, chacun avec un prix mensuel et un prix annuel retrouvés par
// leur clé de recherche (`lookup_key`). Les outils du club sont inclus dans le
// forfait : ils n'ont ni produit ni prix. Utilisé par le script de création
// (scripts/stripe-creer-produits-outils.mjs) et par l'action `verifier-prix`.
export function lignesStripe() {
  const produits = [
    ...PALIERS_EDUCATEUR.map(p => ({ type: 'pack', ...p })),
    ...FORFAITS_CLUB.map(f => ({ type: 'forfait', ...f })),
  ]
  return produits.flatMap(p => {
    const produitId = p.type === 'pack' ? (p.id === '9' ? 'pack_educateur' : `pack_educateur_${p.id}`) : `forfait_club_${p.palier}`
    const commun = { produitId, produitNom: p.nom, type: p.type, ref: p.id }
    return [
      { ...commun, cle: p.cleMensuel, montant: p.prixMensuel * 100, intervalle: 'month' },
      { ...commun, cle: p.cleAnnuel, montant: p.prixAnnuel * 100, intervalle: 'year' },
    ]
  })
}

// Compare le catalogue à ce que Stripe renvoie. Fonction pure.
export function comparerPrix(attendus, trouves) {
  const parCle = new Map(trouves.map(p => [p.cle, p]))
  const manquants = []
  const differents = []
  for (const a of attendus) {
    const p = parCle.get(a.cle)
    if (!p) manquants.push(a.cle)
    else if (p.montant !== a.montant || p.devise !== 'eur' || p.intervalle !== a.intervalle) differents.push(a.cle)
  }
  const modes = new Set(trouves.map(p => p.live))
  return {
    ok: manquants.length === 0 && differents.length === 0 && modes.size <= 1,
    total: attendus.length,
    conformes: attendus.length - manquants.length - differents.length,
    manquants,
    differents,
    mode: modes.size === 0 ? null : modes.size > 1 ? 'mélangé' : [...modes][0] ? 'live' : 'test',
  }
}

export const outilsDuRole = (role) => OUTILS.filter(o => o.role === role)
export const trouverOutil = (role, id) => OUTILS.find(o => o.role === role && o.id === id) || null
export const outilsAchetables = (role) => outilsDuRole(role).filter(o => o.achetable)

// Outil éducateur reçu via l'outil club indiqué (null si le club ne peut pas
// l'ouvrir à ses éducateurs).
export const outilEducateurPour = (clubOutilId) => OUTILS.find(o => o.role === 'educateur' && o.viaClub === clubOutilId) || null

// Outils du club que le club peut ouvrir à ses éducateurs affiliés : ceux qui
// ont un équivalent côté éducateur.
export const outilsOuvrables = () => outilsDuRole('club').filter(o => outilEducateurPour(o.id))

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

// Type de compte créé d'après la réponse à la question 1 (null tant qu'elle manque).
export const roleDepuisReponses = (reponses = {}) => {
  if (reponses.q1 === 'dirigeant_club') return 'club'
  return reponses.q1 === 'educateur_independant' || reponses.q1 === 'educateur_club' ? 'educateur' : null
}

const PRECOCHAGE = {
  educateur: {
    q3: {
      seances: ['seances', 'tactique'],
      suivi: ['suivi_joueurs', 'evaluations_video'],
      matchs: ['tactique', 'stats_collectives'],
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
    if (!o || !o.achetable) return null
    if (o.inclus) continue
    if (typeof o[champ] !== 'number') return null
    total += o[champ]
  }
  return total
}

export const PERIODICITES = ['mensuel', 'annuel']

export const trouverForfait = (palier) => FORFAITS_CLUB.find(f => f.palier === palier) || null

// Plus petit forfait qui couvre ce nombre d'équipes (null au-delà du dernier).
export function forfaitPourEquipes(nbEquipes) {
  const n = Math.max(1, Number(nbEquipes) || 0)
  return FORFAITS_CLUB.find(f => f.equipes >= n) || null
}

// Ce qu'on paie en une fois au premier paiement (bloc 7), pour une seule
// périodicité : clés de recherche Stripe des lignes et total en euros.
// Éducateur : le palier qui couvre le nombre d'outils choisis ; club : un
// forfait, ses outils y sont inclus. Rend { erreur } si la demande n'est pas valable. Fonction pure.
export function compositionPaiement(role, { outils = [], palier = null, pack = false, periodicite } = {}, nbEquipes = 0) {
  if (!PERIODICITES.includes(periodicite)) return { erreur: 'Choisis le paiement mensuel ou annuel' }
  const annuel = periodicite === 'annuel'
  if (role === 'club') {
    const f = trouverForfait(palier)
    if (!f) return { erreur: 'Forfait inconnu' }
    if (f.equipes < nbEquipes) return { erreur: `Ton club a ${nbEquipes} équipes : ce forfait en couvre ${f.equipes}` }
    return { cles: [annuel ? f.cleAnnuel : f.cleMensuel], total: annuel ? f.prixAnnuel : f.prixMensuel, palier: f.palier }
  }
  if (role !== 'educateur') return { erreur: 'Paiement réservé aux éducateurs et aux clubs' }
  const demandes = pack ? outilsDuPack() : outils
  if (!Array.isArray(demandes) || demandes.length === 0) return { erreur: 'Choisis au moins un outil' }
  if (new Set(demandes).size !== demandes.length) return { erreur: 'Un outil est en double' }
  const choisis = demandes.map(id => trouverOutil('educateur', id))
  if (choisis.some(o => !o || !o.achetable || o.inclus)) return { erreur: 'Outil inconnu ou non disponible à l\'achat' }
  const p = palierPourNombre(demandes.length)
  if (!p) return { erreur: 'Choisis au plus 9 outils' }
  // Le palier « tous les outils » donne les 9, même si moins ont été cochés.
  return {
    cles: [annuel ? p.cleAnnuel : p.cleMensuel],
    total: annuel ? p.prixAnnuel : p.prixMensuel,
    outils: p.max === 9 ? outilsDuPack() : [...demandes],
    paliersOutils: p.id,
  }
}

// Tarif payé, retrouvé par sa clé de recherche Stripe (écran « Mon abonnement »).
// Rend { type: 'palier' | 'forfait', nom, prix, periodicite, palier | forfait } ou null.
export function tarifParCle(cle) {
  const annuel = /_annuel$/.test(cle || '')
  const periodicite = annuel ? 'annuel' : 'mensuel'
  const p = PALIERS_EDUCATEUR.find(x => x.cleMensuel === cle || x.cleAnnuel === cle)
  if (p) return { type: 'palier', nom: p.nom, prix: annuel ? p.prixAnnuel : p.prixMensuel, periodicite, palier: p }
  const f = FORFAITS_CLUB.find(x => x.cleMensuel === cle || x.cleAnnuel === cle)
  if (f) return { type: 'forfait', nom: f.nom, prix: annuel ? f.prixAnnuel : f.prixMensuel, periodicite, forfait: f }
  return null
}

// Même palier ou même forfait dans l'autre périodicité (bloc 9), pour passer
// de mensuel à annuel ou l'inverse à l'échéance. null pour un ancien tarif à l'unité.
export function clePourPeriodicite(cle, periodicite) {
  const t = tarifParCle(cle)
  if (!t || !PERIODICITES.includes(periodicite)) return null
  const x = t.palier || t.forfait
  return periodicite === 'annuel' ? x.cleAnnuel : x.cleMensuel
}

// Rang d'un tarif dans sa gamme (paliers éducateur ou forfaits club), pour
// savoir si un changement monte ou descend. 0 pour un ancien tarif à l'unité.
function rangTarif(cle) {
  const iP = PALIERS_EDUCATEUR.findIndex(p => p.cleMensuel === cle || p.cleAnnuel === cle)
  if (iP >= 0) return iP + 1
  const iF = FORFAITS_CLUB.findIndex(f => f.cleMensuel === cle || f.cleAnnuel === cle)
  return iF >= 0 ? iF + 1 : 0
}

// Modification d'un abonnement en cours (bloc 8), même périodicité.
// `cleActuelle` : clé de recherche du tarif payé aujourd'hui ; `outilsActuels` :
// outils de l'éducateur sur cet abonnement ; `demande` : comme pour le paiement
// ({ outils } ou { pack } pour l'éducateur, { palier } pour le club).
// Rend { cle, total, sens: 'hausse' | 'baisse' | 'meme', outils?, palier? } ou { erreur }.
// hausse : la différence est facturée tout de suite ; baisse : le nouveau prix
// s'applique à l'échéance ; meme : seul le choix des outils change. Fonction pure.
export function planModification(role, { cleActuelle, outilsActuels = [] }, demande = {}, nbEquipes = 0) {
  const periodicite = /_annuel$/.test(cleActuelle || '') ? 'annuel' : 'mensuel'
  const compo = compositionPaiement(role, { ...demande, periodicite }, nbEquipes)
  if (compo.erreur) return compo
  const cle = compo.cles[0]
  const avant = rangTarif(cleActuelle)
  const apres = rangTarif(cle)
  const sens = apres > avant ? 'hausse' : apres < avant ? 'baisse' : 'meme'
  if (role === 'club') {
    if (sens === 'meme') return { erreur: 'C\'est déjà ton forfait' }
    return { cle, total: compo.total, sens, palier: compo.palier }
  }
  const memes = compo.outils.length === outilsActuels.length && compo.outils.every(o => outilsActuels.includes(o))
  if (sens === 'meme' && memes) return { erreur: 'Rien à changer : ce sont déjà tes outils' }
  return { cle, total: compo.total, sens, outils: compo.outils }
}

// Jours entiers restants d'un essai (arrondi au-dessus), 0 si expiré ou absent.
export function joursRestantsEssai(essaiFin, maintenant = new Date()) {
  const reste = ts(essaiFin) - ts(maintenant)
  if (!(reste > 0)) return 0
  return Math.ceil(reste / 86400000)
}

// Garde-fou de la bascule (bloc 16) : outils achetables sans prix complet.
export function outilsSansPrix() {
  return OUTILS.filter(o => o.achetable && !o.inclus && (typeof o.prixMensuel !== 'number' || typeof o.prixAnnuel !== 'number'))
    .map(o => `${o.role}/${o.id}`)
}
