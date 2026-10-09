import { FORMATS_VIDEO, verifierJetonSupabase, configCloudinaryDepuisEnv, authentifier, repondreSignature } from './_securite.js'

// Signature d'upload des clips de montage (MontageVideo.jsx) — dossier
// séparé du clip de profil. Identité = jeton Supabase vérifié ; le joueur
// ne peut signer que pour lui-même (un joueurId différent => 403) ; dossier,
// identifiant et formats vidéo imposés par le serveur.
// NB : MontageVideo n'est importé par aucune page à ce jour ; l'endpoint
// reste néanmoins exposé, d'où sa sécurisation.

export function creerHandler({ verifierJeton, lireConfig, maintenant = () => Date.now() }) {
  return async function handler(req, res) {
    const utilisateur = await authentifier(req, res, verifierJeton)
    if (!utilisateur) return

    const { joueurId } = req.body || {}
    if (joueurId && joueurId !== utilisateur.id) return res.status(403).json({ error: 'Accès refusé pour ce joueur' })

    const config = lireConfig()
    if (!config) return res.status(500).json({ error: 'Configuration serveur incomplète' })

    const timestamp = Math.round(maintenant() / 1000)
    return repondreSignature(res, {
      config,
      resource_type: 'video',
      params: {
        folder: `montages/${utilisateur.id}`,
        public_id: `clip_${timestamp}`,
        timestamp,
        allowed_formats: FORMATS_VIDEO,
      },
    })
  }
}

export default creerHandler({ verifierJeton: verifierJetonSupabase, lireConfig: configCloudinaryDepuisEnv })
