/* global process */
import { verifierJetonSupabase, authentifier } from './_securite.js'
import { donneesSupabase, peutEditerPourClub, estRecruteurActif, peutUtiliserOutilsEducateur, peutUtiliserSeanceIABeta, lireIdsBetaSeanceIA, estUuid } from './_droits.js'
import { ACTIONS, MODELE, ErreurEntree } from './_promptsIA.js'

// Proxy IA authentifié vers Groq. Remplace les appels faits auparavant
// depuis le navigateur avec VITE_GROQ_API_KEY — clé alors embarquée en clair
// dans le JavaScript public. Ici :
// - clé GROQ_API_KEY lue côté serveur uniquement (jamais renvoyée) ;
// - identité = jeton Supabase vérifié ; action dans une liste fermée ;
// - le prompt est construit ICI à partir de données validées (tailles
//   bornées) : pas de prompt ni de modèle libres => pas de chatbot ouvert ;
// - droits selon le profil (mêmes règles que les dashboards) ;
// - limite de requêtes par utilisateur (best effort, par instance) et
//   max_completion_tokens imposé ;
// - réponse au même format que l'API Groq ({ choices } ou { error }) pour ne
//   rien changer au traitement côté interface. 429 renvoyé tel quel : la
//   file d'attente du navigateur (groqQueue) réessaie comme avant.

// Durée maximale (60 s) déclarée dans vercel.json → functions["api/ia.js"].

const URL_GROQ = 'https://api.groq.com/openai/v1/chat/completions'
const MSG_INDISPONIBLE = 'Le service IA est indisponible pour le moment. Réessaie dans quelques minutes.'
const MSG_SATURE = 'Le service IA est momentanément saturé.'

// ── Limiteur en mémoire (par instance serverless — protection minimale,
//    cf. rapport : une limite globale fiable demande un stockage partagé). ──
export function creerLimiteur({ max = 20, fenetreMs = 10 * 60 * 1000, maintenant = () => Date.now() } = {}) {
  const historique = new Map()
  return (cle) => {
    const t = maintenant()
    const recents = (historique.get(cle) || []).filter((x) => t - x < fenetreMs)
    if (recents.length >= max) { historique.set(cle, recents); return false }
    recents.push(t)
    historique.set(cle, recents)
    if (historique.size > 5000) historique.clear()
    return true
  }
}

export async function appelerGroqReel({ messages, params }) {
  const cle = process.env.GROQ_API_KEY
  if (!cle) throw new Error('config_groq_absente')
  const controle = new AbortController()
  const minuteur = setTimeout(() => controle.abort(), 55000)
  try {
    const r = await fetch(URL_GROQ, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cle}` },
      body: JSON.stringify({ model: MODELE, reasoning_effort: 'low', messages, ...params }),
      signal: controle.signal,
    })
    return { statut: r.status, data: await r.json().catch(() => ({})) }
  } finally {
    clearTimeout(minuteur)
  }
}

async function autoriser({ action, donnees, userId, entrees, idsBeta }) {
  switch (ACTIONS[action].profil) {
    case 'recruteur': return estRecruteurActif({ donnees, userId })
    case 'educateur': return peutUtiliserOutilsEducateur({ donnees, userId })
    // Génération de séance : bêta fermée (SEANCE_IA_BETA_USER_IDS), sans délégation.
    case 'educateur_beta': return peutUtiliserSeanceIABeta({ donnees, userId, idsBeta })
    // Import du planning : même droit que l'édition de la section « terrains »
    // (PlanningTerrains rendu en mode dirigeant avec readOnly = !canEditSection('terrains')).
    case 'club_terrains': return estUuid(entrees.clubId) && peutEditerPourClub({ donnees, userId, clubId: entrees.clubId, section: 'terrains' })
    default: return false
  }
}

export function creerHandler({ verifierJeton, donnees, appelerGroq, limiteur = creerLimiteur(), lireIdsBeta = lireIdsBetaSeanceIA }) {
  return async function handler(req, res) {
    const formater = (message) => ({ error: { message } })
    const utilisateur = await authentifier(req, res, verifierJeton, formater)
    if (!utilisateur) return
    const erreur = (statut, message) => res.status(statut).json(formater(message))
    const idsBeta = lireIdsBeta()

    // « capacites » : indique à l'interface quels outils afficher (aucun
    // appel Groq, aucune donnée sensible renvoyée) — l'affichage suit ainsi
    // la même règle serveur que l'autorisation, sans identifiant dans le code.
    if ((req.body || {}).action === 'capacites') {
      try {
        return res.status(200).json({ seance_ia: await peutUtiliserSeanceIABeta({ donnees, userId: utilisateur.id, idsBeta }) })
      } catch {
        return erreur(500, 'Vérification des droits impossible.')
      }
    }

    const corps = req.body || {}
    const action = corps.action
    if (typeof action !== 'string' || !Object.prototype.hasOwnProperty.call(ACTIONS, action)) return erreur(400, 'Action IA inconnue.')
    const entrees = corps.entrees && typeof corps.entrees === 'object' && !Array.isArray(corps.entrees) ? corps.entrees : {}

    let valeurs
    try {
      valeurs = ACTIONS[action].valider(entrees)
    } catch (e) {
      if (e instanceof ErreurEntree) return erreur(400, e.message)
      throw e
    }

    try {
      if (!(await autoriser({ action, donnees, userId: utilisateur.id, entrees, idsBeta }))) return erreur(403, "Cette fonctionnalité n'est pas disponible pour ton compte.")
    } catch {
      return erreur(500, 'Vérification des droits impossible.')
    }

    if (!limiteur(utilisateur.id)) return erreur(429, 'Trop de demandes IA en peu de temps. Patiente quelques minutes.')

    let reponse
    try {
      reponse = await appelerGroq(ACTIONS[action].construire(valeurs))
    } catch (e) {
      return erreur(e?.message === 'config_groq_absente' ? 500 : 502, MSG_INDISPONIBLE)
    }
    if (reponse.statut === 429) return erreur(429, MSG_SATURE)
    if (reponse.statut !== 200 || reponse.data?.error) return erreur(502, MSG_INDISPONIBLE)

    // Seul le contenu final est renvoyé (pas le raisonnement du modèle).
    const contenu = reponse.data?.choices?.[0]?.message?.content || ''
    return res.status(200).json({ choices: [{ message: { content: contenu } }] })
  }
}

export default creerHandler({ verifierJeton: verifierJetonSupabase, donnees: donneesSupabase(), appelerGroq: appelerGroqReel })
