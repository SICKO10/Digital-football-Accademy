// File d'attente séquentielle pour tous les appels à l'API Groq côté client :
// un seul appel HTTP en vol à la fois (jamais en parallèle), retry silencieux
// après 35s en cas de 429 (rate limit), jamais de 429 brut remonté à
// l'appelant — seulement une erreur propre si le rate limit persiste au-delà
// du nombre de tentatives max.
//
// Portée : ce module est un singleton par onglet/session navigateur. Il
// sérialise entre eux les appels Groq DE CETTE session, mais ne peut pas
// savoir ce qui se passe dans le navigateur d'un AUTRE utilisateur — la clé
// API Groq est partagée par toute l'app, donc deux personnes qui scannent en
// même temps depuis deux appareils différents peuvent quand même se
// percuter sur le rate limit global du compte Groq. Une vraie file
// inter-utilisateurs demanderait de faire transiter ces appels par un
// serveur (Edge Function) qui centralise la séquence, pas juste ce module.

const RETRY_DELAY_MS = 35000
const MAX_RETRIES = 10 // ~6 min avant d'abandonner et de remonter une erreur propre

const file = []
let enTraitement = false

const attendre = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function notifierPositions() {
  file.forEach((job, i) => {
    job.onStatus?.({ state: i === 0 ? job.etat : 'attente', position: i })
  })
}

async function executerJob(job) {
  for (let tentative = 0; tentative <= MAX_RETRIES; tentative++) {
    job.etat = 'en_cours'
    notifierPositions()
    const res = await fetch(job.url, job.options)
    if (res.status === 429) {
      job.etat = 'rate_limited'
      notifierPositions()
      await attendre(RETRY_DELAY_MS)
      continue
    }
    return res.json()
  }
  throw new Error('Le service est temporairement surchargé, réessaie dans quelques minutes.')
}

async function traiterFile() {
  if (enTraitement) return
  enTraitement = true
  while (file.length > 0) {
    const job = file[0]
    try {
      job.resolve(await executerJob(job))
    } catch (err) {
      job.reject(err)
    }
    file.shift()
    notifierPositions()
  }
  enTraitement = false
}

/**
 * Ajoute une requête Groq à la file globale et retourne le JSON déjà parsé
 * de la réponse (jamais un 429 : ceux-ci sont ré-essayés silencieusement en
 * interne). Rejette seulement sur une erreur définitive (réseau, ou rate
 * limit qui persiste au-delà de MAX_RETRIES).
 *
 * onStatus(status), optionnel, est rappelé à chaque changement d'état de
 * CETTE requête : status = { state: 'attente' | 'en_cours' | 'rate_limited', position }
 * (position 0 = c'est son tour, position N = N requêtes devant elle).
 */
export function enqueueGroqRequest(url, options, onStatus) {
  return new Promise((resolve, reject) => {
    file.push({ url, options, onStatus, resolve, reject, etat: 'attente' })
    notifierPositions()
    traiterFile()
  })
}

// Libellé prêt à afficher pour un status renvoyé par onStatus — jamais de
// détail technique (429, code HTTP...), toujours un message utilisateur.
export function libelleStatutGroq(status) {
  if (!status) return 'Analyse en cours...'
  if (status.state === 'rate_limited') return 'Analyse en cours... (nouvelle tentative dans un instant)'
  if (status.state === 'attente') return `En file d'attente (position ${status.position + 1})`
  return 'Analyse en cours...'
}
