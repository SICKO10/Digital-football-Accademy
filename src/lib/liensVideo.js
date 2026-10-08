// Validation des liens vidéo publiables (Jogabonito, clip Pro, feed).
// Liste blanche stricte des plateformes réellement prises en charge par
// l'affichage (Jogabonito.jsx : intégration YouTube/TikTok, bouton
// Instagram/Veo). Tout le reste est refusé : protocoles dangereux
// (javascript:, data:, http: non chiffré…), domaines arbitraires, domaines
// « sosies » (youtube.com.exemple.com), identifiants dans l'URL
// (https://youtube.com@exemple.com) et ports non standard.
// Module sans dépendance (testé avec node --test, cf. tests/).

const PLATEFORMES = {
  youtube: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'],
  tiktok: ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'],
  instagram: ['instagram.com', 'www.instagram.com'],
  veo: ['veo.co', 'www.veo.co', 'app.veo.co'],
}
// Vidéos envoyées via l'upload signé (jamais saisies à la main) — acceptées
// uniquement à l'affichage, cf. estLienVideoAffichable.
const HOTES_UPLOAD = ['res.cloudinary.com']

const LONGUEUR_MAX = 2048

function analyser(brut) {
  if (typeof brut !== 'string') return null
  const texte = brut.trim()
  if (!texte || texte.length > LONGUEUR_MAX || /\s/.test(texte)) return null
  try { return new URL(texte) } catch { return null }
}

function plateformeDe(hote) {
  for (const [nom, hotes] of Object.entries(PLATEFORMES)) if (hotes.includes(hote)) return nom
  return null
}

// Résultat : { ok: true, url, plateforme } ou { ok: false, raison }
// raison ∈ 'format' | 'protocole' | 'plateforme'
export function validerLienVideo(brut) {
  const url = analyser(brut)
  if (!url) return { ok: false, raison: 'format' }
  if (url.protocol !== 'https:') return { ok: false, raison: 'protocole' }
  if (url.username || url.password || url.port) return { ok: false, raison: 'plateforme' }
  const plateforme = plateformeDe(url.hostname.toLowerCase())
  if (!plateforme) return { ok: false, raison: 'plateforme' }
  return { ok: true, url: url.href, plateforme }
}

// Pour l'AFFICHAGE d'un lien déjà en base (données anciennes ou insérées
// hors application) : n'ouvre un lien que s'il vise une plateforme prise en
// charge ou l'hébergement d'upload.
export function estLienVideoAffichable(brut) {
  if (validerLienVideo(brut).ok) return true
  const url = analyser(brut)
  return !!url && url.protocol === 'https:' && !url.username && !url.password && !url.port
    && HOTES_UPLOAD.includes(url.hostname.toLowerCase())
}

// Clé de traduction (translations.js) correspondant à une raison de refus.
export const cleErreurLien = (raison) => (raison === 'protocole' ? 'lien_video_https' : raison === 'plateforme' ? 'lien_video_plateforme' : 'lien_video_format')
