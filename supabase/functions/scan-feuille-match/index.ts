import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { verifierOutil } from '../_shared/verrouOutils.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const prompt = `Analyse cette feuille de match football et extrais les données visibles.
Réponds UNIQUEMENT avec un objet JSON valide, aucun texte avant ou après, aucune balise markdown.

RÈGLE ABSOLUE : liste TOUS les joueurs visibles sur la feuille, dans les deux
colonnes (equipe_gauche ET equipe_droite), sans exception — titulaires,
remplaçants, joueurs sans but ni carton. Ne t'arrête pas après quelques noms.
Relis l'image de haut en bas deux fois avant de répondre : une feuille de
match contient généralement 11 à 20 noms par équipe, si tu en listes beaucoup
moins c'est probablement que tu en as manqué. Si tu n'es pas sûr d'un nom,
mets quand même ta meilleure lecture plutôt que de sauter le joueur.

Format exact attendu :
{
  "date": "YYYY-MM-DD ou null",
  "competition": "nom ou null",
  "equipe_adversaire": "nom de l'équipe adverse ou null",
  "domicile": true,
  "score_domicile": 0,
  "score_exterieur": 0,
  "equipe_gauche": ["PRENOM NOM", ...],
  "equipe_droite": ["PRENOM NOM", ...],
  "buts_gauche": ["PRENOM NOM", ...],
  "buts_droite": ["PRENOM NOM", ...],
  "cartons_jaunes": ["PRENOM NOM", ...],
  "cartons_rouges": ["PRENOM NOM", ...],
  "buts_minutes": [{ "colonne": "gauche ou droite", "minute": 23 }, ...]
}

Lis chaque nom exactement comme écrit sur la feuille.
Si une info n'est pas visible, mets un tableau vide [] ou null selon le champ.
Deux formats de feuille sont possibles :
1. Feuille papier classique : les buts et cartons sont listés à part, avec les
   minutes écrites à côté (souvent près d'un symbole ⚽).
2. Composition d'appli (type FFF) : un petit pictogramme ballon apparaît
   directement à côté du nom d'un buteur dans la liste des joueurs, et un
   petit carré jaune ou rouge à côté du nom d'un joueur averti/expulsé — sans
   minute visible dans ce cas. Dans ce format, mets ce joueur dans buts_gauche/
   buts_droite ou cartons_jaunes/cartons_rouges même sans minute associée.
Pour "buts_minutes" : un élément par but dont la minute est effectivement
visible, avec la colonne (gauche/droite, même convention que equipe_gauche/
equipe_droite). Si la minute d'un but n'est pas visible, ne mets pas
d'élément pour ce but plutôt qu'une minute inventée — le but reste quand
même listé dans buts_gauche/buts_droite.`

// Format de réponse imposé à Gemini (responseJsonSchema) : la réponse est
// directement un JSON valide conforme à ce schéma, au lieu d'un texte libre
// qu'il fallait nettoyer (cause d'échecs quand l'IA ajoutait du texte).
const nomListe = { type: 'array', items: { type: 'string' } }
const schema = {
  type: 'object',
  properties: {
    date: { type: ['string', 'null'] },
    competition: { type: ['string', 'null'] },
    equipe_adversaire: { type: ['string', 'null'] },
    domicile: { type: ['boolean', 'null'] },
    score_domicile: { type: ['integer', 'null'] },
    score_exterieur: { type: ['integer', 'null'] },
    equipe_gauche: nomListe,
    equipe_droite: nomListe,
    buts_gauche: nomListe,
    buts_droite: nomListe,
    cartons_jaunes: nomListe,
    cartons_rouges: nomListe,
    buts_minutes: {
      type: 'array',
      items: {
        type: 'object',
        properties: { colonne: { type: 'string', enum: ['gauche', 'droite'] }, minute: { type: 'integer' } },
        required: ['colonne', 'minute'],
      },
    },
  },
  required: ['equipe_gauche', 'equipe_droite', 'buts_gauche', 'buts_droite', 'cartons_jaunes', 'cartons_rouges', 'buts_minutes'],
}

// Fiabilité sur l'offre gratuite de l'API Gemini (choix de Kevin, nov. 2026) :
// - modèles listés comme stables par Google (gemini-3.7-flash, épinglé avant,
//   n'apparaît plus dans la liste officielle) ; le second sert de secours si
//   le premier est surchargé (503) ou à court de quota (429), chaque modèle
//   ayant son propre quota gratuit ;
// - réflexion du modèle réduite (thinkingLevel LOW) : lire une feuille ne
//   demande pas un long raisonnement, c'était la plus grosse source de lenteur ;
// - délai maximum par essai et budget total sous la limite de Supabase
//   (sinon la fonction est coupée net, erreur 546, sans message utile) ;
// - chaque essai est écrit dans les journaux (modèle, durée, résultat).
const MODELES = ['gemini-3.6-flash', 'gemini-3.5-flash-lite']
const ESSAIS_PAR_MODELE = 2
const DELAI_ESSAI_MS = 45000
const BUDGET_TOTAL_MS = 110000
const DELAI_MAX_ATTENTE_MS = 15000

const estTransitoire = (code, message) =>
  code === 503 || code === 429 || code === 500 || code === 'delai' || code === 'reseau' ||
  /high demand|overloaded|unavailable|quota|rate limit/i.test(message || '')

const delaiSuggereMs = (data) => {
  const info = (data?.error?.details || []).find(d => d['@type']?.includes('RetryInfo'))
  const secondes = info?.retryDelay ? parseFloat(info.retryDelay) : null
  return Number.isFinite(secondes) ? Math.min(secondes * 1000, DELAI_MAX_ATTENTE_MS) : null
}

async function appelerGemini(modele, imageBase64, mimeType, apiKey, delaiMs) {
  const controleur = new AbortController()
  const minuteur = setTimeout(() => controleur.abort(), delaiMs)
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controleur.signal,
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 16384,
            responseMimeType: 'application/json',
            responseJsonSchema: schema,
            thinkingConfig: { thinkingLevel: 'LOW' },
          },
        }),
      }
    )
    const data = await response.json()
    return { data, code: data?.error?.code ?? (response.ok ? null : response.status) }
  } catch (e) {
    const code = e?.name === 'AbortError' ? 'delai' : 'reseau'
    return { data: { error: { message: code === 'delai' ? 'délai dépassé' : String(e?.message || e) } }, code }
  } finally {
    clearTimeout(minuteur)
  }
}

const extraireResultat = (data) => {
  const parts = data?.candidates?.[0]?.content?.parts || []
  const text = parts.filter(p => !p.thought).map(p => p.text || '').join('')
  try { return JSON.parse(text) } catch { /* repli ci-dessous */ }
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null
  try { return JSON.parse(jsonMatch[0]) } catch { return null }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const refus = await verifierOutil(req, ['stats_collectives'], corsHeaders)
  if (refus) return refus

  const repondre = (status, corps) => new Response(JSON.stringify(corps), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

  try {
    const debut = Date.now()
    const { imageBase64, mimeType } = await req.json()
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    const tailleKo = Math.round((imageBase64?.length || 0) * 0.75 / 1024)
    let derniereErreur = null

    for (const modele of MODELES) {
      for (let essai = 1; essai <= ESSAIS_PAR_MODELE; essai++) {
        const restant = BUDGET_TOTAL_MS - (Date.now() - debut)
        if (restant < 10000) break
        const t0 = Date.now()
        const { data, code } = await appelerGemini(modele, imageBase64, mimeType, GEMINI_API_KEY, Math.min(DELAI_ESSAI_MS, restant))
        const resultat = data?.error ? null : extraireResultat(data)
        console.log(JSON.stringify({
          scan: 'feuille-match', modele, essai, taille_ko: tailleKo, duree_ms: Date.now() - t0,
          resultat: resultat ? 'ok' : (code ?? 'json_invalide'), message: data?.error?.message?.slice(0, 200),
        }))
        if (resultat) return repondre(200, { resultat })

        derniereErreur = data?.error?.message || 'réponse illisible'
        // Erreur définitive (clé, requête refusée...) : inutile d'insister
        // sur ce modèle, on passe directement au modèle de secours.
        if (data?.error && !estTransitoire(code, data.error.message)) break
        if (essai < ESSAIS_PAR_MODELE) {
          const attente = Math.min(delaiSuggereMs(data) ?? 1500, BUDGET_TOTAL_MS - (Date.now() - debut) - 10000)
          if (attente > 0) await new Promise(r => setTimeout(r, attente))
        }
      }
    }

    console.error(JSON.stringify({ scan: 'feuille-match', echec: derniereErreur, duree_totale_ms: Date.now() - debut }))
    return repondre(503, { error: "L'IA de Google n'a pas pu lire la feuille pour le moment (service chargé ou trop lent). Ta photo est gardée : réessaie dans une minute." })
  } catch (err) {
    return repondre(500, { error: err.message })
  }
})
