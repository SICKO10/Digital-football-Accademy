import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
              {
                text: `Analyse ce programme de préparation physique football.
Extrais le planning et retourne UNIQUEMENT un JSON valide avec cette structure exacte :
{
  "titre": "nom du programme",
  "nb_semaines": 2,
  "semaines": [
    {
      "numero": 1,
      "jours": [
        { "jour": "lundi", "exercice": "Footing 35min + gainage", "type": "course", "repos": false },
        { "jour": "mardi", "exercice": "Renforcement haut + bas du corps", "type": "renforcement", "repos": false },
        { "jour": "mercredi", "exercice": "Fractionné 10x30\"/30\"", "type": "fractionne", "repos": false },
        { "jour": "jeudi", "exercice": "", "type": null, "repos": true },
        { "jour": "vendredi", "exercice": "Footing 40min + 6 accélérations 60m", "type": "course", "repos": false },
        { "jour": "samedi", "exercice": "Circuit training 30min", "type": "circuit", "repos": false },
        { "jour": "dimanche", "exercice": "", "type": null, "repos": true }
      ]
    }
  ],
  "tests": [
    { "nom": "CMJ (Saut vertical)", "objectif": "> 38 cm" },
    { "nom": "Sprint 10m", "objectif": "< 1,80s" }
  ]
}
Le champ "type" doit être une de ces valeurs exactes : "course", "renforcement", "fractionne", "circuit", "gainage", ou null si "repos" est true ou si le type n'est pas déterminable.
Ne retourne rien d'autre que le JSON.`
              },
              {
                inline_data: {
                  mime_type: mimeType || 'image/jpeg',
                  data: imageBase64
                }
              }
            ]
          }],
          generationConfig: { temperature: 0.1 }
        })
      }
    )

    const data = await response.json()
    if (data.error) throw new Error(data.error.message)
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Extraire le JSON même s'il y a du texte autour
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error(`Gemini n'a pas retourné de JSON valide: ${text.substring(0, 300)}`)
    const programme = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify({ programme }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
