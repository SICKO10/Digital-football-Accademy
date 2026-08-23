// Petits helpers partagés entre plusieurs sections du dashboard coach.
// Prennent `c` (palette du thème courant, cf. useCoachTheme) en paramètre
// pour rester cohérents que l'utilisateur soit en clair ou en sombre.
export const getStatutColor = (c, statut) => {
  if (statut === 'en_attente') return c.warn
  if (statut === 'validé') return c.success
  if (statut === 'rejeté') return c.danger
  if (statut === 'analyse') return c.success
  return c.textMuted
}

export const getStatutLabel = (statut) => {
  if (statut === 'en_attente') return 'En attente'
  if (statut === 'analyse') return 'Analyse envoyée'
  if (statut === 'validé') return '✅ Validé'
  if (statut === 'rejeté') return '❌ Rejeté'
  return statut
}

export const getVideoUrl = (demande) => demande.video_url || demande.lien_video || demande.clip_url || null
export const isVeo = (url) => url && url.includes('veo.co')
export const isYoutube = (url) => url && (url.includes('youtube.com') || url.includes('youtu.be'))
