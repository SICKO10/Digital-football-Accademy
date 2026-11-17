// Styles communs aux écrans Finance (budget, sponsors, déplacements), au-dessus du kit
// d'identité (src/lib/identite.js).
import { styleCarte } from './identite.js'
import { police, forme } from '../tokens.js'

// Carte avec liseré de statut (recettes en vert, dépenses en rouge) sur le bord gauche.
export function carteStatut(colors, couleur) {
  return { ...styleCarte(colors), padding: '20px 20px 20px 23px', boxShadow: `inset ${forme.lisere} 0 0 ${couleur}` }
}

// Montant : chiffres condensés à chasse fixe.
export const styleMontant = (colors, taille = 20, poids = 700) => ({
  fontFamily: police.titre, fontWeight: poids, fontSize: `${taille}px`, lineHeight: 1.1,
  fontVariantNumeric: 'tabular-nums', color: colors.text.primary,
})
