// Logique pure du CRM admin (onglet CRM de /coach) : libellés et calculs de la
// phase test. Aucune donnée inventée : tout vient des lignes crm_tests.

export const CATEGORIES = [
  { id: 'club', label: 'Clubs' },
  { id: 'educateur', label: 'Éducateurs' },
  { id: 'joueur', label: 'Joueurs' },
]
export const LIBELLE_CATEGORIE = { club: 'Club', educateur: 'Éducateur', joueur: 'Joueur' }

export const STATUTS = [
  { id: 'nouveau', label: 'Nouveau' },
  { id: 'contacte', label: 'Contacté' },
  { id: 'echange', label: 'En discussion' },
  { id: 'test', label: 'En test' },
  { id: 'converti', label: 'Converti' },
  { id: 'perdu', label: 'Perdu' },
]
export const LIBELLE_STATUT = Object.fromEntries(STATUTS.map(s => [s.id, s.label]))
export const VARIANTE_STATUT = { nouveau: 'blue', contacte: 'blue', echange: 'pending', test: 'pending', converti: 'success', perdu: 'inactive' }

export const TYPES_ECHANGE = [
  { id: 'appel', label: 'Appel' },
  { id: 'email', label: 'Email' },
  { id: 'rdv', label: 'Rendez-vous' },
  { id: 'message', label: 'Message' },
  { id: 'note', label: 'Note' },
]

export const LIBELLE_ORIGINE = { essai: 'Essai lancé par le client', offre: 'Offre de ma part', manuel: 'Saisi à la main' }

export const JOUR_MS = 86400000

// Tranches de durée d'essai comparées entre elles.
export const TRANCHES_DUREE = [
  { id: 'a', label: '7 jours ou moins', max: 7 },
  { id: 'b', label: '8 à 14 jours', max: 14 },
  { id: 'c', label: '15 à 30 jours', max: 30 },
  { id: 'd', label: 'Plus de 30 jours', max: Infinity },
]

export const trancheDuree = (jours) => TRANCHES_DUREE.find(t => jours <= t.max)

// converti | en_cours | expire (fini sans achat)
export function etatTest(t, maintenantMs = Date.now()) {
  if (t.converti_le) return 'converti'
  if (!t.fin_le || new Date(t.fin_le).getTime() > maintenantMs) return 'en_cours'
  return 'expire'
}

export function joursRestants(t, maintenantMs = Date.now()) {
  if (!t.fin_le) return null
  return Math.ceil((new Date(t.fin_le).getTime() - maintenantMs) / JOUR_MS)
}

const taux = (convertis, clos) => (clos > 0 ? Math.round((convertis / clos) * 100) : null)

function resume(tests, maintenantMs) {
  const etats = tests.map(t => etatTest(t, maintenantMs))
  const convertis = etats.filter(e => e === 'converti').length
  const expires = etats.filter(e => e === 'expire').length
  return {
    total: tests.length,
    enCours: etats.filter(e => e === 'en_cours').length,
    convertis,
    expires,
    taux: taux(convertis, convertis + expires), // seulement sur les essais terminés
  }
}

// Mesures de la phase test. Le taux ne compte que les essais terminés
// (convertis ou expirés) : un essai encore en cours n'est ni un succès ni un échec.
export function statsTests(tests, maintenantMs = Date.now()) {
  const global = resume(tests, maintenantMs)

  const delais = tests
    .filter(t => t.converti_le)
    .map(t => (new Date(t.converti_le).getTime() - new Date(t.debut_le).getTime()) / JOUR_MS)
    .filter(d => d >= 0)
  const delaiMoyen = delais.length ? Math.round((delais.reduce((a, b) => a + b, 0) / delais.length) * 10) / 10 : null

  const parCategorie = CATEGORIES.map(cat => ({ ...cat, ...resume(tests.filter(t => t.categorie === cat.id), maintenantMs) }))
  const parDuree = TRANCHES_DUREE.map(tr => ({
    ...tr,
    ...resume(tests.filter(t => t.duree_jours && trancheDuree(t.duree_jours)?.id === tr.id), maintenantMs),
  }))

  const parOutil = {}
  for (const t of tests) {
    const cle = t.outil || 'sans_outil'
    ;(parOutil[cle] ||= []).push(t)
  }
  const outils = Object.entries(parOutil)
    .map(([outil, liste]) => ({ outil, ...resume(liste, maintenantMs) }))
    .sort((a, b) => b.total - a.total)

  const bientot = tests
    .filter(t => etatTest(t, maintenantMs) === 'en_cours' && t.fin_le && joursRestants(t, maintenantMs) <= 7)
    .sort((a, b) => new Date(a.fin_le) - new Date(b.fin_le))

  return { global, delaiMoyen, parCategorie, parDuree, outils, bientot }
}

export const pourcent = (v) => (v === null ? 'pas encore de données' : `${v} %`)
