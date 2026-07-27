import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!
const SUPADATA_API_KEY = Deno.env.get('SUPADATA_API_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Transcription YouTube via l'API Supadata (https://docs.supadata.ai/get-transcript) ──
// Remplace l'ancien scraping direct de la page YouTube, trop fragile (structure de
// page qui change, murs de consentement UE depuis une IP de datacenter).
async function getYouTubeTranscript(youtubeUrl: string): Promise<string> {
  const headers = { 'x-api-key': SUPADATA_API_KEY }
  const params = new URLSearchParams({ url: youtubeUrl, text: 'true', lang: 'fr' })

  const res = await fetch(`https://api.supadata.ai/v1/transcript?${params}`, { headers })
  const data = await res.json()

  if (res.status === 202 && data.jobId) {
    return await pollSupadataJob(data.jobId, headers)
  }

  if (!res.ok) {
    throw new Error(`Supadata error: ${data.error || res.statusText}`)
  }

  if (typeof data.content !== 'string') {
    throw new Error('Réponse Supadata inattendue (pas de transcription textuelle).')
  }

  return data.content
}

async function pollSupadataJob(jobId: string, headers: Record<string, string>): Promise<string> {
  const deadline = Date.now() + 55_000 // reste sous la limite d'exécution de l'edge function

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 1000))
    const res = await fetch(`https://api.supadata.ai/v1/transcript/${jobId}`, { headers })
    const data = await res.json()

    if (data.status === 'completed') {
      if (typeof data.content !== 'string') {
        throw new Error('Réponse Supadata inattendue (pas de transcription textuelle).')
      }
      return data.content
    }
    if (data.status === 'failed') {
      throw new Error(`Échec de la transcription YouTube : ${data.error || 'raison inconnue'}`)
    }
  }

  throw new Error('La transcription YouTube prend trop de temps (vidéo longue) — réessaie plus tard.')
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/  // ID direct
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // Vérifie que l'appelant est bien authentifié — la fonction est déployée
    // avec vérification JWT (pas de --no-verify-jwt) pour éviter que n'importe
    // qui sans compte puisse consommer le quota Groq gratuitement.
    const authHeader = req.headers.get('Authorization') || ''
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: caller } } = await supabaseAuth.auth.getUser()
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: CORS })
    }

    const formData = await req.formData()
    const nomJoueur = (formData.get('nomJoueur') as string) || 'Joueur non précisé'
    const youtubeUrl = formData.get('youtubeUrl') as string | null
    const fichier = formData.get('fichier') as File | null

    let transcription = ''

    if (youtubeUrl) {
      // ── Chemin YouTube : récupération de la transcription automatique ──
      const videoId = extractVideoId(youtubeUrl)
      if (!videoId) {
        return new Response(JSON.stringify({ error: 'URL YouTube invalide.' }), {
          status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
        })
      }
      transcription = await getYouTubeTranscript(youtubeUrl)

    } else if (fichier) {
      if (fichier.size > 25 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: 'Fichier trop volumineux (max 25 Mo — limite Groq Whisper)' }), {
          status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
        })
      }

      // ── Chemin fichier : transcription Whisper ─────────────────────────
      const whisperForm = new FormData()
      whisperForm.append('file', fichier, fichier.name)
      whisperForm.append('model', 'whisper-large-v3')
      whisperForm.append('language', 'fr')
      whisperForm.append('response_format', 'text')

      const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
        body: whisperForm,
      })

      if (!whisperRes.ok) {
        const err = await whisperRes.text()
        throw new Error(`Whisper error: ${err}`)
      }
      transcription = await whisperRes.text()

    } else {
      return new Response(JSON.stringify({ error: 'Fichier ou lien YouTube requis.' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
      })
    }

    // ── Structuration via Groq LLaMA (identique pour les deux chemins) ────
    const prompt = `Tu es un expert en analyse football. Un coach a enregistré son analyse vocale d'un joueur.
Voici la transcription : """${transcription}"""

Génère un rapport structuré en JSON avec exactement ces clés :
{
  "resume": "Synthèse globale en 2-3 phrases, style professionnel, tu du joueur",
  "points_forts": ["point 1", "point 2", "point 3"],
  "axes_amelioration": ["axe 1", "axe 2", "axe 3"],
  "conseils": "Conseil du coach en 2-3 phrases concrètes pour les prochaines séances",
  "note_globale": 7,
  "sections_analyse": [
    {
      "titre": "POSITIONNEMENT",
      "description": "Observation précise sur le positionnement du joueur, 1-2 phrases",
      "repere": "phrase courte d'un repère pratique à retenir"
    },
    {
      "titre": "TRANSITION",
      "description": "Observation sur les transitions offensives/défensives, 1-2 phrases",
      "repere": "phrase courte d'un repère pratique à retenir"
    },
    {
      "titre": "PRISE DE DÉCISION",
      "description": "Observation sur la lecture du jeu et les choix techniques, 1-2 phrases",
      "repere": "phrase courte d'un repère pratique à retenir"
    },
    {
      "titre": "GESTION DE L'ESPACE",
      "description": "Observation sur l'utilisation et la création d'espaces, 1-2 phrases",
      "repere": "phrase courte d'un repère pratique à retenir"
    }
  ],
  "priorite": "Une seule phrase d'action prioritaire à travailler à l'entraînement"
}
note_globale est un entier de 1 à 10.
Les titres des sections peuvent varier selon le contenu de l'analyse (ex: PRESSING, DUELS, RELANCE...).
Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`

    const llmRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    })

    if (!llmRes.ok) {
      const err = await llmRes.text()
      throw new Error(`LLaMA error: ${err}`)
    }

    const llmData = await llmRes.json()
    const rawJSON = llmData.choices?.[0]?.message?.content || '{}'

    let rapport
    try {
      rapport = JSON.parse(rawJSON)
    } catch {
      // Extraire le JSON si le modèle a ajouté du texte autour
      const match = rawJSON.match(/\{[\s\S]*\}/)
      rapport = match ? JSON.parse(match[0]) : {}
    }

    return new Response(JSON.stringify({
      transcription,
      rapport,
      nomJoueur,
      typeAnalyse: 'Bilan de match',
      date: new Date().toLocaleDateString('fr-FR'),
    }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
    })
  }
})
