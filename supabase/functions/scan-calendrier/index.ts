import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const prompt = `Tu analyses une ou plusieurs photos d'un calendrier de football.
Extrait TOUS les matchs visibles sur les photos.
Réponds UNIQUEMENT avec du JSON valide, sans texte autour:
{
  "matchs": [
    {
      "journee": "J1" ou null,
      "date": "YYYY-MM-DD" ou null,
      "heure": "HH:MM" ou null,
      "equipe_domicile": "Nom complet de l'équipe",
      "equipe_exterieur": "Nom complet de l'équipe",
      "competition": "Nom de la compétition" ou null
    }
  ]
}`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // images: [{ base64, mimeType }] — plusieurs photos d'un même calendrier
    const { images } = await req.json()
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
              ...(images || []).map((img: { base64: string; mimeType?: string }) => ({
                inline_data: { mime_type: img.mimeType || 'image/jpeg', data: img.base64 },
              })),
            ],
          }],
          generationConfig: { temperature: 0.2 },
        }),
      }
    )

    const data = await response.json()
    if (data.error) throw new Error(data.error.message)
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error(`Gemini n'a pas retourné de JSON valide: ${text.substring(0, 300)}`)
    const { matchs } = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify({ matchs: matchs || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
