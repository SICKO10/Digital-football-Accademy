import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const prompt = `Tu analyses une fiche procédé de football (peut être une fiche FFF, manuscrite structurée, ou format Digital Football).
Extrais exactement ces champs en JSON :
{
  "nom": "titre du procédé",
  "theme": "Offensif, Défensif, Coup de pied arrêté, Gardien de but ou Physique",
  "principe_jeu": "principe de jeu si mentionné, sinon null",
  "categorie_age": "Pour tous, U6-U7, U8-U9, U10-U11, U12-U13, U14-U15, U16-U17, U18-U19 ou Senior",
  "nb_joueurs": "nombre de joueurs si mentionné, sinon null",
  "duree": nombre de minutes ou null,
  "but": "objectif du procédé",
  "organisation": "description de l'organisation",
  "consignes": "règles et consignes",
  "variables": "variantes et progressions",
  "criteres_realisation": "critères de réalisation si mentionnés, sinon null",
  "schema_data": {
    "elements": [
      // Un objet par élément visible sur le schéma tactique (terrain/dessin), pas dans le texte.
      // Joueur/marqueur (rond/carré coloré) : { "type": "joueur", "x": 0-100, "y": 0-100, "couleur": "noir|bleu|rouge|jaune|orange|vert|blanc|violet" }
      // Ballon : { "type": "ballon", "x": 0-100, "y": 0-100 }
      // Cage/but : { "type": "but", "x": 0-100, "y": 0-100, "orientation": "horizontal" ou "vertical" }
      // Flèche : { "type": "fleche", "x1": 0-100, "y1": 0-100, "x2": 0-100, "y2": 0-100, "style": "passe" (trait plein, ballon/passe) ou "course" (pointillé, déplacement sans ballon) }
    ]
  }
}
"x"/"y" et "x1,y1,x2,y2" sont en pourcentage de la zone de dessin du schéma dans l'image (0=gauche/haut, 100=droite/bas) — pas du document entier. Si le document ne contient aucun schéma tactique dessiné (que du texte), renvoie "schema_data": { "elements": [] }.
Si un champ n'est pas visible, mets null (ou une valeur par défaut raisonnable pour theme/categorie_age si le document ne la précise pas explicitement).
Réponds UNIQUEMENT en JSON valide, sans texte autour.`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { imageBase64, mimeType } = await req.json()
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'Image manquante' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    // Le frontend (ScannerProc.jsx) redimensionne déjà avant l'envoi — ce
    // garde-fou couvre un appel direct sans passer par ce chemin, pour
    // renvoyer une erreur claire plutôt qu'un crash Gemini/plateforme opaque.
    if (imageBase64.length > 6_000_000) {
      return new Response(JSON.stringify({ error: 'Image trop lourde. Réduis la résolution avant de scanner.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY non configurée dans les secrets Supabase')

    // Gemini renvoie parfois un 503 UNAVAILABLE (modèle surchargé côté Google,
    // transitoire) ou un 429 — mais un 429 peut être soit une limite par minute
    // (transitoire, vaut le coup de retenter), soit un quota de plan/billing
    // épuisé ("quota" dans le message) — ce dernier ne se régénère pas en
    // quelques secondes, retenter ne fait qu'ajouter 3 échecs pour rien.
    let response
    let errText = ''
    // 4 tentatives, backoff exponentiel 2s/4s/8s : un 503 Gemini est aléatoire
    // et court côté Google, il passe presque toujours avant la 4e tentative.
    for (let tentative = 0; tentative < 4; tentative++) {
      response = await fetch(
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
            generationConfig: { temperature: 0.1 },
          }),
        }
      )
      if (response.ok) break
      if (response.status === 503 || response.status === 429) {
        errText = await response.text()
        const quotaEpuise = response.status === 429 && /quota/i.test(errText)
        if (quotaEpuise) {
          return new Response(JSON.stringify({ error: 'Quota Gemini dépassé pour ce plan — vérifie la facturation sur https://ai.dev/rate-limit avant de réessayer.' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        if (tentative < 3) { await new Promise(r => setTimeout(r, Math.pow(2, tentative + 1) * 1000)); continue }
      }
      break
    }

    if (!response.ok) {
      if (!errText) errText = await response.text()
      throw new Error(`Gemini API error ${response.status}: ${errText.slice(0, 300)}`)
    }
    const data = await response.json()
    if (data.error) throw new Error(data.error.message)
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error(`Gemini n'a pas retourné de JSON valide: ${text.substring(0, 300)}`)
    const procede = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify({ procede }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    // Temporaire : stack/type en plus du message, pour diagnostiquer le 500
    // qui persiste malgré les garde-fous déjà en place — à retirer une fois
    // la cause confirmée.
    console.error('scan-procede error:', err)
    return new Response(JSON.stringify({ error: err.message, stack: err.stack, type: err?.constructor?.name }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
