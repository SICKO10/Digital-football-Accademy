import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const promptExtraction = (categorie: string, saison: string) => `Tu es un assistant spécialisé dans l'analyse de documents de planification annuelle de football (catégorie ${categorie}, saison ${saison}).

Analyse cette image (tableau, planche ou document manuscrit) et extrais toutes les informations visibles.
Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans texte avant ou après, au format exact :
{
  "date_debut": "date de début de saison si visible, format YYYY-MM-DD sinon null",
  "date_fin": "date de fin de saison si visible, format YYYY-MM-DD sinon null",
  "nb_seances_semaine": nombre d'entraînements par semaine si mentionné sinon null,
  "projet_jeu": "phrase de projet de jeu du club si présente sinon null",
  "valeurs": ["valeur1", "valeur2", ...] (valeurs du club listées, tableau vide si aucune),
  "phases": [
    {
      "nom": "nom de la phase (ex: S'organiser, Progresser...)",
      "type": "preparation" | "competition" | "treve" | "bilan",
      "date_debut": "YYYY-MM-DD ou null",
      "date_fin": "YYYY-MM-DD ou null",
      "duree_semaines": nombre ou null,
      "theme_offensif": "thème offensif de la phase ou null",
      "sous_principes_offensifs": ["...", ...],
      "theme_defensif": "thème défensif de la phase ou null",
      "sous_principes_defensifs": ["...", ...],
      "objectifs_prioritaires": ["...", ...],
      "criteres_reussite": ["...", ...]
    }
  ],
  "competitions": [
    { "nom": "nom de l'échéance", "date": "YYYY-MM-DD ou null", "type": "championnat" | "coupe" | "tournoi" | "amical" | "autre" }
  ]
}

Résous les années à 2 chiffres (ex: "26" → 20${saison.slice(2, 4)} ou 20${saison.slice(7, 9)} selon le mois) à partir de la saison ${saison}. Si une phase n'a pas de type explicite, déduis-le du contexte (une phase de début de saison est "preparation", une coupure est "treve", une évaluation finale est "bilan", sinon "competition"). Si une information n'est pas visible, mets null ou un tableau vide. Extrais toutes les phases visibles, sans limite.`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { imageBase64, mimeType, categorie, saison } = await req.json()
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: promptExtraction(categorie || '', saison || '') },
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
    const resultat = JSON.parse(jsonMatch[0])

    return new Response(JSON.stringify({ resultat }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
