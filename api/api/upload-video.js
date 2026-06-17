import { v2 as cloudinary } from 'cloudinary'
import { createClient } from '@supabase/supabase-js'
import formidable from 'formidable'
import fs from 'fs'

export const config = { api: { bodyParser: false } }

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  const form = formidable({ maxFileSize: 500 * 1024 * 1024 })

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Erreur parsing' })

    const file = files.video?.[0] || files.video
    const userId = fields.userId?.[0] || fields.userId

    if (!file || !userId) return res.status(400).json({ error: 'Fichier ou userId manquant' })

    try {
      const result = await cloudinary.uploader.upload(file.filepath || file.path, {
        resource_type: 'video',
        folder: 'digital-football',
        public_id: `joueur_${userId}_${Date.now()}`,
      })

      await supabase.from('profiles').update({ clip_url: result.secure_url }).eq('id', userId)

      fs.unlinkSync(file.filepath || file.path)

      return res.status(200).json({ url: result.secure_url })
    } catch (e) {
      console.error('Erreur upload:', e.message)
      return res.status(500).json({ error: e.message })
    }
  })
}