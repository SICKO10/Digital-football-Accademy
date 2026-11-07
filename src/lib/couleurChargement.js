import { useState } from 'react'
import { calculerPalette, lireHex } from './paletteClub'

// Les écrans de chargement apparaissent avant que la couleur du club soit connue :
// on garde donc la dernière couleur vue dans ce navigateur. Aucune couleur
// mémorisée (ou club sans couleur) : le vert Digital Football par défaut.
const CLE = 'df_couleur_club'

export function memoriserCouleurClub(hex) {
  try {
    if (hex && lireHex(hex)) localStorage.setItem(CLE, hex)
    else localStorage.removeItem(CLE)
  } catch { /* stockage indisponible : on reste sur le vert */ }
}

function lireCouleurMemorisee() {
  try { return localStorage.getItem(CLE) } catch { return null }
}

// Couleur d'accent des écrans de chargement (fond sombre : version « sombre » de
// la palette, garantie lisible). Lue une seule fois au montage : l'écran ne change
// pas de couleur en cours de chargement.
export function useCouleurChargement() {
  const [couleur] = useState(() => calculerPalette(lireCouleurMemorisee(), 'sombre').primary)
  return couleur
}
