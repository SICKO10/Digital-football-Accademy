import { demanderSignatureImage, ajouterChampsSignes, urlUploadCloudinary } from './signatureUpload'

// Envoi d'une image du module Stages (photo, objet oublié, logo sponsor) sur
// Cloudinary, via une signature délivrée par /api/upload-image (usage
// « stage » : droits vérifiés côté serveur). Renvoie l'URL sécurisée.
const TAILLE_MAX = 12 * 1024 * 1024

export async function envoyerImageStage(fichier, clubId) {
  if (!fichier) throw new Error('Aucun fichier choisi.')
  if (!fichier.type.startsWith('image/')) throw new Error('Seules les images sont acceptées.')
  if (fichier.size > TAILLE_MAX) throw new Error('Image trop lourde (12 Mo maximum).')
  const signature = await demanderSignatureImage({ usage: 'stage', clubId })
  const formData = ajouterChampsSignes(new FormData(), signature)
  formData.append('file', fichier)
  const res = await fetch(urlUploadCloudinary(signature), { method: 'POST', body: formData })
  const data = await res.json().catch(() => ({}))
  if (!data.secure_url) throw new Error(data.error?.message || 'Échec de l\'envoi de l\'image.')
  return data.secure_url
}
