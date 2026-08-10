import { v2 as cloudinary } from 'cloudinary'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  const { userId, type } = req.body || {}
  if (!userId) return res.status(400).json({ error: 'userId manquant' })

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })

  const timestamp = Math.round(Date.now() / 1000)
  // type optionnel : garde "certifications" par défaut pour ne rien changer
  // aux appelants existants (avatar club, certifications éducateur...).
  const folder = `digital-football/${userId}/${type || 'certifications'}`
  const prefix = type || 'certif'
  const public_id = `${prefix}_${timestamp}_${Math.random().toString(36).substr(2, 6)}`

  const paramsToSign = { folder, public_id, timestamp }

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  )

  return res.status(200).json({
    signature,
    timestamp,
    folder,
    public_id,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
  })
}
