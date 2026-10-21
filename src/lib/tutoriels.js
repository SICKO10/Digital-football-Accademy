// Tutoriels guidés (cf. components/tutoriels) : mémorise, par utilisateur et
// par navigateur, ceux déjà vus — pour ne les ouvrir automatiquement qu'une
// fois. Toujours relançables à la main via le bouton « Tutoriel » de la page.
const cle = (id, userId) => `df_tuto_${id}_${userId || 'anon'}`

export function tutorielDejaVu(id, userId) {
  try { return localStorage.getItem(cle(id, userId)) === '1' } catch { return true }
}

export function marquerTutorielVu(id, userId) {
  try { localStorage.setItem(cle(id, userId), '1') } catch { /* navigation privée */ }
}
