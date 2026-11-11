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

// Promotions par rythme de paiement : un seul endroit à modifier pour lancer ou
// arrêter une promo. `mensuel` : remise sur les `mois` premiers mensualités ;
// `annuel` : remise sur l'abonnement annuel. null = pas de promo pour ce rythme.
// Exemple de promo annuelle : annuel: { pourcent: 20 }. `code` : code Stripe propre
// à cette promo (par défaut PROMO_CODE). Même date de fin pour toutes (PROMO_FIN).
// Lus par la page « Comment financer » (case promotion) et par les cartes club de /offres.
export const PROMOS = {
  mensuel: { pourcent: PROMO_POURCENT, mois: 1 },
  annuel: null,
}

// Promotions en cours : [{ mode, pourcent, mois?, code }]. Vide une fois la date passée.
export const promosActives = () => (promoActive()
  ? Object.entries(PROMOS).filter(([, p]) => p).map(([mode, p]) => ({ mode, ...p, code: p.code || PROMO_CODE }))
  : [])

const arrondi = (n) => Math.round(n * 100) / 100

// Coût de la 1re année d'un palier ({ mois, an }) selon le rythme de paiement,
// avec la promo de ce rythme si elle existe (sans promo : 12 mensualités, ou le prix annuel).
export function coutPremiereAnnee({ mois, an }, mode) {
  const p = PROMOS[mode]
  if (mode === 'mensuel') return arrondi(mois * 12 - (p ? mois * (p.pourcent / 100) * (p.mois ?? 1) : 0))
  if (mode === 'annuel') return arrondi(an * (1 - (p ? p.pourcent / 100 : 0)))
  throw new Error(`Rythme de paiement inconnu : ${mode}`)
}
