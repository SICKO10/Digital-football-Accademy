import { useState, useEffect } from 'react'

// Un iPad en paysage dépasse souvent 1024px de large (1024-1366px selon le
// modèle), donc un seuil de largeur seul ne suffit pas à garder le menu
// réduit dans cette orientation — au-delà de 1024px on ne bascule plus que
// si l'appareil est tactile (pointer: coarse), pour ne pas non plus
// déclencher le mode réduit sur un laptop/desktop à une largeur proche
// (1366px est une résolution laptop très courante).
const calcIsMobile = () => {
  if (typeof window === 'undefined') return false
  const tactile = window.matchMedia?.('(pointer: coarse)')?.matches ?? false
  return window.innerWidth < 1024 || (tactile && window.innerWidth < 1366)
}

export function useIsMobileOrTablet() {
  const [isMobile, setIsMobile] = useState(calcIsMobile)
  useEffect(() => {
    const onResize = () => setIsMobile(calcIsMobile())
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])
  return isMobile
}
