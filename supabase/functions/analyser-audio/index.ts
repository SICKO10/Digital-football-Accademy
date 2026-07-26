import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getYouTubeTranscript(videoId: string): Promise<string> {
  // Récupère la page YouTube pour trouver les pistes de sous-titres
  const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    }
  })
  const html = await pageRes.text()

  // Extraire les pistes de captions du code source
  const captionMatch = html.match(/"captionTracks":(\[.*?\])/)
  if (!captionMatch) {
    throw new Error('Aucune transcription disponible pour cette vidéo YouTube. Assure-toi que les sous-titres automatiques sont activés.')
  }

  const tracks = JSON.parse(captionMatch[1])
  // Préférer le français, sinon prendre le premier disponible
  const track = tracks.find((t: { languageCode?: string }) => t.languageCode === 'fr')
    || tracks.find((t: { languageCode?: string }) => t.languageCode?.startsWith('fr'))
    || tracks[0]

  if (!track?.baseUrl) throw new Error('Piste de transcription introuvable.')

  const xmlRes = await fetch(track.baseUrl)
  const xml = await xmlRes.text()

  // Parser le XML pour extraire le texte
  const segments = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
    .map(m => m[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/<[^>]+>/g, '')
      .trim()
    )
    .filter(Boolean)

  return segments.join(' ')
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
      transcription = await getYouTubeTranscript(videoId)

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
  "resume": "Résumé global de l'analyse en 2-3 phrases",
  "points_forts": ["point 1", "point 2", "point 3"],
  "axes_amelioration": ["axe 1", "axe 2", "axe 3"],
  "conseils": "Conseils pratiques du coach pour la prochaine séance",
  "note_globale": 7
}
note_globale est un entier de 1 à 10.
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
