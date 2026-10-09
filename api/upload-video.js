import {
  FORMATS_IMAGE, FORMATS_VIDEO, lireJeton, verifierJetonSupabase, configCloudinaryDepuisEnv,
  authentifier, repondreSignature,
} from './_securite.js'

// Signature d'upload Cloudinary (vidéos de joueurs/éducateurs, et images
// d'avatar — endpoint générique malgré son nom, cf. DashboardEducateur).
//
// Sécurité :
// - l'identité vient UNIQUEMENT du jeton Supabase (Authorization: Bearer),
//   vérifié côté serveur par supabase.auth.getUser(jeton). Un userId envoyé
//   dans le corps est ignoré : avant ce correctif, n'importe qui pouvait
//   obtenir une signature pour le dossier de n'importe quel utilisateur ;
// - le dossier et l'identifiant public sont imposés par le serveur
//   (digital-football/<id vérifié>) ;
// - les formats sont restreints par type via allowed_formats, paramètre
//   SIGNÉ : un client ne peut ni le retirer ni le modifier sans invalider
//   la signature. Cloudinary rejette aussi d'office une signature de plus
//   d'une heure ;
// - le secret Cloudinary ne quitte jamais le serveur (seuls cloud_name et
//   api_key, publics par nature, sont renvoyés) ;
// - configuration absente => refus (500), jamais de repli permissif.
//
// La taille maximale n'est PAS imposable par une signature Cloudinary : elle
// reste contrôlée côté navigateur (200 Mo) et par les limites du compte
// Cloudinary — cf. compte rendu du lot sécurité.

export { lireJeton, verifierJetonSupabase }

export const TYPES_UPLOAD = {
  video: { resource_type: 'video', allowed_formats: FORMATS_VIDEO },
  image: { resource_type: 'image', allowed_formats: FORMATS_IMAGE },
}

export function creerHandler({ verifierJeton, lireConfig, maintenant = () => Date.now() }) {
  return async function handler(req, res) {
    const utilisateur = await authentifier(req, res, verifierJeton)
    if (!utilisateur) return

    const type = (req.body && req.body.kind) || 'video'
    const regles = Object.prototype.hasOwnProperty.call(TYPES_UPLOAD, type) ? TYPES_UPLOAD[type] : null
    if (!regles) return res.status(400).json({ error: 'Type de fichier non pris en charge' })

    const config = lireConfig()
    if (!config) return res.status(500).json({ error: 'Configuration serveur incomplète' })

    const timestamp = Math.round(maintenant() / 1000)
    return repondreSignature(res, {
      config,
      resource_type: regles.resource_type,
      params: {
        folder: `digital-football/${utilisateur.id}`,
        public_id: `${regles.resource_type === 'video' ? 'clip' : 'img'}_${timestamp}`,
        timestamp,
        allowed_formats: regles.allowed_formats,
      },
    })
  }
}

export default creerHandler({ verifierJeton: verifierJetonSupabase, lireConfig: configCloudinaryDepuisEnv })
