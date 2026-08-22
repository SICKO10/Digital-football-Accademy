// Détection plateforme pour le bandeau "Ajouter à l'écran d'accueil" —
// volontairement du sniffing UA simple (pas de lib externe) : on a juste
// besoin de distinguer iOS / Android / desktop, pas de détecter un
// navigateur précis.
export const detecterPlateforme = () => {
  const ua = navigator.userAgent || ''
  // iPadOS 13+ se présente comme "Macintosh" avec support tactile — le seul
  // moyen fiable de le distinguer d'un vrai Mac.
  const estIpadOS13Plus = ua.includes('Macintosh') && navigator.maxTouchPoints > 1
  if (/iPhone|iPad|iPod/.test(ua) || estIpadOS13Plus) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

// Deux façons de savoir que l'app est déjà installée : standalone mode
// (Android/Chrome et la plupart des navigateurs PWA) ou navigator.standalone
// (propriété non standard, spécifique à Safari iOS).
export const estDejaInstallee = () =>
  window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true

const CLE_STOCKAGE = 'df_install_banniere_masquee_jusqua'
const DUREE_MASQUAGE_JOURS = 30

export const banniereDoitEtreMasquee = () => {
  const jusqua = Number(localStorage.getItem(CLE_STOCKAGE) || 0)
  return Date.now() < jusqua
}

export const masquerBanniere = () => {
  const jusqua = Date.now() + DUREE_MASQUAGE_JOURS * 24 * 60 * 60 * 1000
  localStorage.setItem(CLE_STOCKAGE, String(jusqua))
}
