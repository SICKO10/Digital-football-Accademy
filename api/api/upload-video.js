import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.VITE_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  const { userId } = req.body
  const timestamp = Math.round(Date.now() / 1000)
  const folder = `digital-football/${userId}`
  const public_id = `clip_${timestamp}`

  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder, public_id },
    process.env.CLOUDINARY_API_SECRET
  )

  res.json({
    signature,
    timestamp,
    folder,
    public_id,
    cloud_name: process.env.VITE_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.VITE_CLOUDINARY_API_KEY,
  })
}