// Extrait l'ID YouTube depuis n'importe quel format d'URL courant.
// [?&]v= (plutôt que \?v=) gère aussi le cas où v n'est pas le premier
// paramètre (ex: watch?list=xxx&v=ID) ; {11} fixe la longueur exacte d'un ID.
export const extractYoutubeId = (url) => {
  if (!url) return null
  const patterns = [
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export const youtubeThumbnail = (youtubeId) =>
  `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
