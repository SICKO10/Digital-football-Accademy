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
  "criteres_realisation": "critères de réalisation si mentionnés, sinon null"
}
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
          generationConfig: { temperature: 0.1 },
        }),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
