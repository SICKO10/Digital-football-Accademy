import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const prompt = `Analyse cet organigramme de club de football (photo ou document) et extrait tous les membres visibles.
Réponds UNIQUEMENT avec un tableau JSON valide, aucun texte avant ou après, aucune balise markdown.

Format exact attendu :
[
  { "nom": "Dupont", "prenom": "Jean", "role": "Président", "departement": "Direction", "superieur": "" },
  { "nom": "Martin", "prenom": "Pierre", "role": "Directeur Sportif", "departement": "Sportif", "superieur": "Dupont Jean" }
]

Règles :
- "superieur" = "Nom Prénom" du supérieur hiérarchique direct visible sur le document (chaîne vide si c'est le sommet de la hiérarchie)
- "departement" = l'un des : Direction, Sportif, Administration, Communication, Finance, Médical, Autre
- Inclure tous les membres visibles sur le document
- Si le prénom n'est pas visible, mets une chaîne vide`

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
          generationConfig: { temperature: 0.3 },
        }),
      }
    )

    const data = await response.json()
    if (data.error) throw new Error(data.error.message)
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error(`Gemini n'a pas retourné de JSON valide: ${text.substring(0, 300)}`)
    const membres = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify({ membres }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
