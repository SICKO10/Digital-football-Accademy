import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const prompt = `Tu es un assistant spécialisé dans l'analyse de fiches de séances d'entraînement football.

Cherche d'abord, en haut de l'image, une étiquette imprimée entre crochets au format [DF-XXX]
(ex: [DF-LIBRE], [DF-BMF], [DF-BEF], [DF-DEF]) — c'est une fiche officielle Digital Football, et
XXX indique son format exact. Si tu ne trouves aucune étiquette de ce type, c'est une fiche
manuscrite libre : traite-la comme le format LIBRE.

Analyse cette image de fiche séance (manuscrite ou imprimée) et extrais toutes les informations visibles.
Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans texte avant ou après:
{
  "format_detecte": "LIBRE, BMF, BEF ou DEF",
  "theme": "titre ou thème de la séance",
  "date": "date si visible (format YYYY-MM-DD)",
  "nb_joueurs": "nombre de joueurs si mentionné",
  "duree_totale": "durée totale si mentionnée",
  "objectif_general": "objectif général / objectif de séance",
  "numero_seance": "numéro de séance si visible (format BEF uniquement)",
  "heure_debut": "heure de début si visible (format BEF uniquement)",
  "phase_jeu": "phase de jeu si visible (formats BMF/BEF/DEF)",
  "principe_jeu": "principe de jeu si visible (formats BMF/BEF/DEF)",
  "constats": "constats si visibles (formats BEF/DEF)",
  "justification_pedagogique": "justification pédagogique si visible (formats BEF/DEF)",
  "auto_evaluation": "auto-évaluation si visible (formats BEF/DEF)",
  "analyse_equipe": "analyse de l'équipe/contexte si visible (format DEF)",
  "bilan_projection": "bilan et projection si visible (format DEF)",
  "procedes": [
    {
      "titre": "nom du procédé/exercice",
      "duree": "durée en minutes",
      "nb_joueurs": "nombre de joueurs",
      "but": "but de l'exercice",
      "organisation": "description de l'organisation",
      "consignes": "consignes de l'exercice",
      "criteres_realisation": "critères de réalisation si visibles",
      "variables": "variantes ou progressions",
      "tps_travail": "temps de travail si visible (format BEF uniquement)",
      "tps_recup": "temps de récupération si visible (format BEF uniquement)",
      "nb_series": "nombre de séries si visible (format BEF uniquement)",
      "nb_repet": "nombre de répétitions si visible (format BEF uniquement)",
      "rpe": "RPE si visible (format BEF uniquement)",
      "pedagogie": "pédagogie si visible (format BEF uniquement)",
      "surface": "surface/zone de terrain si visible (format BEF uniquement)",
      "comportements_attendus": "comportements attendus si visibles (format BEF uniquement)",
      "systemes_jeu": "systèmes de jeu si visibles (format BEF uniquement)",
      "criteres_reussite": "critères de réussite si visibles (format BEF uniquement)",
      "dominantes_impacts": "dominantes-impacts athlétiques si visibles (format BEF uniquement)",
      "bilan_posture": "bilan posture/engagement si visible (format BEF uniquement)",
      "bilan_remediations": "remédiations si visibles (format BEF uniquement)"
    }
  ]
}

Ne remplis les champs marqués "format BEF uniquement" que si le format détecté est BEF (laisse-les
à null sinon, et utilise plutôt but/organisation/consignes/variables). Si une information n'est pas
visible, mets null pour ce champ. Extrais jusqu'à 4 procédés/exercices maximum.`

// Gemini renvoie régulièrement « high demand » / 503 UNAVAILABLE (ou 429)
// quand le modèle est saturé côté Google : erreur passagère, la même image
// passe quelques secondes plus tard. On réessaie donc automatiquement
// (jusqu'à 3 tentatives, espacées de 3 s puis 6 s) — uniquement tant que les
// tentatives échouent vite, pour rester loin de la limite de durée d'une
// Edge Function (une analyse réussie prend déjà jusqu'à ~1 min).
const TENTATIVES_MAX = 3
const DELAIS_MS = [3000, 6000]
const BUDGET_REESSAI_MS = 40000

const estSaturation = (statut: number, message: string) =>
  statut === 503 || statut === 429 || /high demand|overloaded|unavailable|resource.?exhausted|try again later/i.test(message || '')

const reponse = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { imageBase64, mimeType } = await req.json()
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    const debut = Date.now()

    let data: any = null
    for (let tentative = 1; tentative <= TENTATIVES_MAX; tentative++) {
      const response = await fetch(
        // Épinglé (pas "-latest", alias que Google permute sans prévenir —
        // cf. scan-feuille-match/index.ts pour le détail).
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } },
              ],
            }],
            generationConfig: { temperature: 0.4 },
          }),
        }
      )
      data = await response.json().catch(() => ({}))
      const message = data?.error?.message || ''
      const sature = estSaturation(response.status, message) && (!!data?.error || !response.ok)
      if (!sature) break
      const reste = tentative < TENTATIVES_MAX && Date.now() - debut < BUDGET_REESSAI_MS
      if (!reste) {
        return reponse({ error: message || 'Service IA saturé', code: 'ia_saturee' }, 503)
      }
      await new Promise((r) => setTimeout(r, DELAIS_MS[tentative - 1]))
    }

    if (data?.error) return reponse({ error: data.error.message, code: 'ia_erreur' }, 502)
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return reponse({ error: `Gemini n'a pas retourné de JSON valide: ${text.substring(0, 300)}`, code: 'lecture_impossible' }, 422)
    let fiche
    try { fiche = JSON.parse(jsonMatch[0]) } catch {
      return reponse({ error: 'Réponse IA illisible (JSON invalide)', code: 'lecture_impossible' }, 422)
    }

    return reponse({ fiche })
  } catch (err) {
    return reponse({ error: err.message, code: 'erreur_serveur' }, 500)
  }
})
