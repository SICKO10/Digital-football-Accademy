import { supabase } from '../supabase'

// Signatures d'upload Cloudinary authentifiées : le serveur déduit
// l'identité du jeton de session (plus jamais d'un userId envoyé par le
// client), vérifie les droits et impose dossier, identifiant public et
// formats autorisés.
async function demanderSignature(endpoint, corps) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Session expirée : reconnecte-toi puis réessaie.')
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(corps),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Signature refusée (${res.status})`)
  return data
}

// /api/upload-video — kind : 'video' (mp4/mov/webm) ou 'image' (avatars).
export const demanderSignatureUpload = (kind = 'video') => demanderSignature('/api/upload-video', { kind })

// /api/upload-image — usage : 'certifications' | 'avatar' | 'licence' |
// 'feuille' | 'seance' (fichiers de l'utilisateur) ; 'avatar_club' | 'theme'
// | 'principe_photo' | 'terrain_fond' | 'terrain_galerie' (avec clubId,
// droits vérifiés côté serveur) ; joueurId : pièces d'un enfant (parent
// accepté uniquement).
export const demanderSignatureImage = ({ usage, clubId, joueurId } = {}) =>
  demanderSignature('/api/upload-image', { usage, clubId, joueurId })

// /api/upload-montage-clip — clips de montage du joueur connecté.
export const demanderSignatureMontage = (joueurId) => demanderSignature('/api/upload-montage-clip', { joueurId })

// Ajoute au FormData tous les champs signés (folder, public_id, timestamp,
// allowed_formats, signature, api_key) — en omettre un invaliderait la
// signature côté Cloudinary.
export function ajouterChampsSignes(formData, signature) {
  for (const [cle, valeur] of Object.entries(signature.params)) formData.append(cle, String(valeur))
  return formData
}

export const urlUploadCloudinary = (signature) =>
  `https://api.cloudinary.com/v1_1/${signature.cloud_name}/${signature.resource_type}/upload`
