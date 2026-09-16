import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
          generationConfig: { temperature: 0.1 },
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
