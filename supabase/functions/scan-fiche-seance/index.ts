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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { imageBase64, mimeType } = await req.json()
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
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

    const data = await response.json()
    if (data.error) throw new Error(data.error.message)
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error(`Gemini n'a pas retourné de JSON valide: ${text.substring(0, 300)}`)
    const fiche = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify({ fiche }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
