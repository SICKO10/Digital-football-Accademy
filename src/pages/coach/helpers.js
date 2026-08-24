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
  if (statut === 'validé') return 'Validé'
  if (statut === 'rejeté') return 'Rejeté'
  return statut
}

export const getVideoUrl = (demande) => demande.video_url || demande.lien_video || demande.clip_url || null
export const isVeo = (url) => url && url.includes('veo.co')
export const isYoutube = (url) => url && (url.includes('youtube.com') || url.includes('youtu.be'))

// `demandes.description` n'a pas de colonnes dédiées pour maillot/temps de jeu —
// Upload.jsx les concatène en texte libre préfixé par emoji (🎽/⏱/⚽/📝). On les
// reparse ici pour les afficher en info-boxes structurées côté coach, sans
// ajouter de colonnes ni inventer de données absentes des anciennes demandes.
export const parseDescription = (description) => {
  const result = { maillot: null, tempsJeu: null, posteJoue: null, notes: '' }
  if (!description) return result
  const reste = []
  description.split('\n').forEach(ligne => {
    const mMaillot = ligne.match(/^🎽 Maillot n°(\d+)/)
    const mTemps = ligne.match(/^⏱ Temps de jeu\s*:\s*(.+)$/)
    const mPoste = ligne.match(/^⚽ Poste joué\s*:\s*(.+)$/)
    const mNotes = ligne.match(/^📝 (.+)$/)
    if (mMaillot) result.maillot = mMaillot[1]
    else if (mTemps) result.tempsJeu = mTemps[1]
    else if (mPoste) result.posteJoue = mPoste[1]
    else if (mNotes) reste.push(mNotes[1])
    else if (ligne.trim()) reste.push(ligne)
  })
  result.notes = reste.join('\n')
  return result
}
