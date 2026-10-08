import { supabase } from '../supabase'

// Signature d'upload Cloudinary via /api/upload-video : le serveur déduit
// l'identité du jeton de session (plus jamais d'un userId envoyé par le
// client) et impose dossier, identifiant public et formats autorisés.
// kind : 'video' (mp4/mov/webm) ou 'image' (jpg/png/webp, ex. avatars).
export async function demanderSignatureUpload(kind = 'video') {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Session expirée : reconnecte-toi puis réessaie.')
  const res = await fetch('/api/upload-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ kind }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Signature refusée (${res.status})`)
  return data
}

// Ajoute au FormData tous les champs signés (folder, public_id, timestamp,
// allowed_formats, signature, api_key) — en omettre un invaliderait la
// signature côté Cloudinary.
export function ajouterChampsSignes(formData, signature) {
  for (const [cle, valeur] of Object.entries(signature.params)) formData.append(cle, String(valeur))
  return formData
}

export const urlUploadCloudinary = (signature) =>
  `https://api.cloudinary.com/v1_1/${signature.cloud_name}/${signature.resource_type}/upload`
