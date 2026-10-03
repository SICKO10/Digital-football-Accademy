import { v2 as cloudinary } from 'cloudinary'
import { createClient } from '@supabase/supabase-js'

// Déclenche la génération Cloudinary d'un montage (concaténation des clips +
// trim de chacun + overlay nom) en ASYNCHRONE (eager_async) — une fonction
// Vercel a un temps d'exécution limité, et concaténer/transcoder plusieurs
// clips vidéo peut largement dépasser cette limite si on attendait la
// réponse de façon synchrone. Cloudinary notifie webhook-montage.js une
// fois le rendu terminé ; côté client, MontageVideo.jsx sonde (poll)
// montages_joueur.statut en attendant.
//
// Technique de concaténation : explicit() ré-applique une transformation
// eager à un asset déjà uploadé (le premier clip), avec un overlay vidéo
// par clip suivant + flag "splice" pour l'enchaîner à la suite — le
// pattern documenté par Cloudinary pour assembler plusieurs clips. Chaque
// overlay est immédiatement refermé par layer_apply avant le suivant.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  const { montage_id, joueur_id } = req.body || {}
  if (!montage_id || !joueur_id) return res.status(400).json({ error: 'montage_id/joueur_id manquant' })

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: montage, error: errMontage } = await supabase
    .from('montages_joueur').select('*').eq('id', montage_id).eq('joueur_id', joueur_id).maybeSingle()
  if (errMontage || !montage) return res.status(404).json({ error: 'Montage introuvable' })

  const { data: clips, error: errClips } = await supabase
    .from('montage_clips').select('*').eq('joueur_id', joueur_id).eq('saison', montage.saison).order('ordre', { ascending: true })
  if (errClips) return res.status(500).json({ error: errClips.message })
  if (!clips || clips.length === 0) return res.status(400).json({ error: 'Aucun clip à assembler' })

  let nomJoueur = null
  if (montage.overlay_nom) {
    const { data: profil } = await supabase.from('profiles').select('prenom, nom').eq('id', joueur_id).maybeSingle()
    if (profil) nomJoueur = `${profil.prenom || ''} ${profil.nom || ''}`.trim()
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })

  const clipBase = clips[0]
  const autresClips = clips.slice(1)

  const transformation = [
    { start_offset: clipBase.trim_debut || 0, ...(clipBase.trim_fin ? { end_offset: clipBase.trim_fin } : {}) },
  ]
  autresClips.forEach(clip => {
    transformation.push({
      overlay: { resource_type: 'video', public_id: clip.cloudinary_public_id },
      start_offset: clip.trim_debut || 0,
      ...(clip.trim_fin ? { end_offset: clip.trim_fin } : {}),
      flags: 'splice',
    })
    transformation.push({ flags: 'layer_apply' })
  })
  if (nomJoueur) {
    transformation.push({
      overlay: { font_family: 'Arial', font_size: 48, font_weight: 'bold', text: nomJoueur },
      color: '#ffffff',
      gravity: 'south_west',
      x: 30,
      y: 30,
    })
    transformation.push({ flags: 'layer_apply' })
  }

  await supabase.from('montages_joueur').update({ statut: 'generation', erreur_message: null }).eq('id', montage_id)

  const siteUrl = `https://${req.headers.host}`
  try {
    await cloudinary.uploader.explicit(clipBase.cloudinary_public_id, {
      resource_type: 'video',
      type: 'upload',
      eager: [{ transformation }],
      eager_async: true,
      eager_notification_url: `${siteUrl}/api/webhook-montage?montage_id=${montage_id}`,
    })
    return res.status(200).json({ ok: true })
  } catch (err) {
    await supabase.from('montages_joueur').update({ statut: 'erreur', erreur_message: err.message }).eq('id', montage_id)
    return res.status(500).json({ error: err.message })
  }
}
