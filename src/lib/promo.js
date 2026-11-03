// Promotion exceptionnelle -70 % sur le premier mois des packs mensuels.
// Fin : 15 novembre 2026, 23h59 (heure de Paris, UTC+1 en novembre). Passé
// cette date, bandeaux et prix barrés disparaissent seuls.
// ATTENTION : ceci n'est que l'affichage. La réduction réelle doit exister
// dans Stripe (code promo ou liens dédiés) avant toute mise en production.
export const PROMO_POURCENT = 70
export const PROMO_CODE = 'LANCEMENT70'
export const PROMO_FIN = new Date('2026-11-15T23:59:59+01:00')

export const promoActive = () => Date.now() <= PROMO_FIN.getTime()

// 10 -> "3", 50 -> "15", 130 -> "39" (arrondi au centime, virgule française)
export const prixPromo = (prix) => {
  const v = Math.round(prix * (100 - PROMO_POURCENT)) / 100
  return String(v).replace('.', ',')
}

// "50€/mois" -> 50
export const prixDepuisTexte = (texte) => parseFloat(String(texte).replace(',', '.'))
