/* global process */
import { v2 as cloudinary } from 'cloudinary'
import { createClient } from '@supabase/supabase-js'

// Briques communes aux endpoints de signature Cloudinary (upload-video,
// upload-image, upload-montage-clip). Préfixe « _ » : Vercel n'expose pas ce
// fichier comme route.

// Formats image communs : pas de SVG (peut embarquer du script).
export const FORMATS_IMAGE = 'jpg,jpeg,png,webp,gif,heic,heif'
export const FORMATS_DOCUMENT = `${FORMATS_IMAGE},pdf`
export const FORMATS_VIDEO = 'mp4,mov,webm'

export function lireJeton(req) {
  const entete = req.headers?.authorization || req.headers?.Authorization || ''
  const m = /^Bearer\s+(\S+)$/.exec(entete)
  return m ? m[1] : null
}

// Client Supabase serveur (clé service, jamais exposée au navigateur), créé
// à l'appel : une variable manquante échoue proprement (=> refus 500).
export function clientServiceSupabase() {
  const url = process.env.SUPABASE_URL
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !cle) throw new Error('config_supabase_absente')
  return createClient(url, cle, { auth: { persistSession: false, autoRefreshToken: false } })
}

// Identité = jeton de session vérifié par Supabase Auth, jamais un id fourni
// par le client.
export async function verifierJetonSupabase(jeton) {
  const { data, error } = await clientServiceSupabase().auth.getUser(jeton)
  if (error || !data?.user?.id) return null
  return { id: data.user.id }
}

export function configCloudinaryDepuisEnv() {
  const { CLOUDINARY_CLOUD_NAME: cloud_name, CLOUDINARY_API_KEY: api_key, CLOUDINARY_API_SECRET: api_secret } = process.env
  return cloud_name && api_key && api_secret ? { cloud_name, api_key, api_secret } : null
}

// Authentification commune : renvoie l'utilisateur vérifié, ou envoie la
// réponse d'erreur et renvoie null.
// formater : forme du corps d'erreur — { error: '…' } par défaut (endpoints
// Cloudinary, lus par signatureUpload.js) ; /api/ia passe { error: { message } },
// format Groq attendu par les composants IA (data.error.message).
export async function authentifier(req, res, verifierJeton, formater = (message) => ({ error: message })) {
  if (req.method !== 'POST') { res.status(405).json(formater('Method Not Allowed')); return null }
  const jeton = lireJeton(req)
  if (!jeton) { res.status(401).json(formater('Authentification requise')); return null }
  let utilisateur
  try { utilisateur = await verifierJeton(jeton) } catch {
    res.status(500).json(formater('Configuration serveur incomplète')); return null
  }
  if (!utilisateur?.id) { res.status(401).json(formater('Jeton invalide ou expiré')); return null }
  return utilisateur
}

// Signe des paramètres imposés par le serveur (dossier, identifiant public,
// formats autorisés) et renvoie la réponse standard — le secret ne sort
// jamais.
export function repondreSignature(res, { config, params, resource_type }) {
  const signature = cloudinary.utils.api_sign_request(params, config.api_secret)
  return res.status(200).json({
    cloud_name: config.cloud_name,
    api_key: config.api_key,
    resource_type,
    // Champs à renvoyer TELS QUELS à Cloudinary (cf. src/lib/signatureUpload.js).
    params: { ...params, signature, api_key: config.api_key },
  })
}

export const aleatoire = () => Math.random().toString(36).slice(2, 8)
