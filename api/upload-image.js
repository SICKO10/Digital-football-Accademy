import { v2 as cloudinary } from 'cloudinary'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  const { userId } = req.body || {}
  if (!userId) return res.status(400).json({ error: 'userId manquant' })

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })

  const timestamp = Math.round(Date.now() / 1000)
  const folder = `digital-football/${userId}/certifications`
  const public_id = `certif_${timestamp}_${Math.random().toString(36).substr(2, 6)}`

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
