import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// Cloudinary notifie ici (eager_notification_url, cf. generer-montage.js)
// une fois la transformation (concaténation + trim + overlay) terminée.
// Body brut nécessaire pour vérifier la signature Cloudinary — désactive
// le bodyParser JSON automatique de Vercel, qui re-sérialiserait le JSON
// différemment (ordre des clés, espaces) et casserait la vérification.
export const config = { api: { bodyParser: false } }

function lireCorpsBrut(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

// Cloudinary : signature = SHA1(corps_brut + timestamp + api_secret), cf.
// https://cloudinary.com/documentation/notifications#verifying_notification_signatures
function signatureValide(corpsBrut, timestamp, signatureRecue) {
  const attendue = crypto.createHash('sha1').update(corpsBrut + timestamp + process.env.CLOUDINARY_API_SECRET).digest('hex')
  return attendue === signatureRecue
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const montageId = req.query.montage_id
  if (!montageId) return res.status(400).json({ error: 'montage_id manquant' })

  const corpsBrut = await lireCorpsBrut(req)
  const timestamp = req.headers['x-cld-timestamp']
  const signature = req.headers['x-cld-signature']
  if (!signature || !timestamp || !signatureValide(corpsBrut, timestamp, signature)) {
    return res.status(401).json({ error: 'Signature invalide' })
  }

  const payload = JSON.parse(corpsBrut)
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // notification_type 'eager' = la transformation demandée (eager_async)
  // est terminée — un eager en erreur n'a pas de secure_url exploitable.
  const resultat = payload.eager?.[0]
  if (payload.notification_type !== 'eager' || !resultat?.secure_url) {
    await supabase.from('montages_joueur').update({
      statut: 'erreur', erreur_message: 'Cloudinary : transformation sans résultat exploitable',
    }).eq('id', montageId)
    return res.status(200).json({ ok: true }) // 200 quand même : accuse réception, Cloudinary ne retente pas
  }

  const { data: montage } = await supabase.from('montages_joueur').select('joueur_id').eq('id', montageId).maybeSingle()
  if (!montage) return res.status(200).json({ ok: true }) // montage supprimé entretemps

  await Promise.all([
    supabase.from('montages_joueur').update({
      statut: 'pret', cloudinary_url: resultat.secure_url, cloudinary_public_id: resultat.public_id,
      updated_at: new Date().toISOString(),
    }).eq('id', montageId),
    supabase.from('profiles').update({ montage_url: resultat.secure_url }).eq('id', montage.joueur_id),
  ])

  return res.status(200).json({ ok: true })
}
