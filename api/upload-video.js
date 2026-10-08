/* global process */
import { v2 as cloudinary } from 'cloudinary'
import { createClient } from '@supabase/supabase-js'

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

export const TYPES_UPLOAD = {
  video: { resource_type: 'video', allowed_formats: 'mp4,mov,webm' },
  image: { resource_type: 'image', allowed_formats: 'jpg,jpeg,png,webp' },
}

export function lireJeton(req) {
  const entete = req.headers?.authorization || req.headers?.Authorization || ''
  const m = /^Bearer\s+(\S+)$/.exec(entete)
  return m ? m[1] : null
}

// Vérificateur réel : client Supabase serveur (clé service, jamais exposée
// au navigateur), créé à l'appel pour qu'une variable manquante échoue
// proprement au lieu de planter au chargement du module.
export async function verifierJetonSupabase(jeton) {
  const url = process.env.SUPABASE_URL
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !cle) throw new Error('config_supabase_absente')
  const supabase = createClient(url, cle, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await supabase.auth.getUser(jeton)
  if (error || !data?.user?.id) return null
  return { id: data.user.id }
}

export function configCloudinaryDepuisEnv() {
  const { CLOUDINARY_CLOUD_NAME: cloud_name, CLOUDINARY_API_KEY: api_key, CLOUDINARY_API_SECRET: api_secret } = process.env
  return cloud_name && api_key && api_secret ? { cloud_name, api_key, api_secret } : null
}

export function creerHandler({ verifierJeton, lireConfig, maintenant = () => Date.now() }) {
  return async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

    const jeton = lireJeton(req)
    if (!jeton) return res.status(401).json({ error: 'Authentification requise' })

    let utilisateur
    try {
      utilisateur = await verifierJeton(jeton)
    } catch {
      return res.status(500).json({ error: 'Configuration serveur incomplète' })
    }
    if (!utilisateur?.id) return res.status(401).json({ error: 'Jeton invalide ou expiré' })

    const type = (req.body && req.body.kind) || 'video'
    const regles = Object.prototype.hasOwnProperty.call(TYPES_UPLOAD, type) ? TYPES_UPLOAD[type] : null
    if (!regles) return res.status(400).json({ error: 'Type de fichier non pris en charge' })

    const config = lireConfig()
    if (!config) return res.status(500).json({ error: 'Configuration serveur incomplète' })

    const timestamp = Math.round(maintenant() / 1000)
    const params = {
      folder: `digital-football/${utilisateur.id}`,
      public_id: `${regles.resource_type === 'video' ? 'clip' : 'img'}_${timestamp}`,
      timestamp,
      allowed_formats: regles.allowed_formats,
    }
    const signature = cloudinary.utils.api_sign_request(params, config.api_secret)

    return res.status(200).json({
      cloud_name: config.cloud_name,
      api_key: config.api_key,
      resource_type: regles.resource_type,
      // Champs à renvoyer TELS QUELS à Cloudinary (cf. src/lib/signatureUpload.js).
      params: { ...params, signature, api_key: config.api_key },
    })
  }
}

export default creerHandler({ verifierJeton: verifierJetonSupabase, lireConfig: configCloudinaryDepuisEnv })
