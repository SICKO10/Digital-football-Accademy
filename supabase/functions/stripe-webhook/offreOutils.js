// Reconnaît les paiements des outils à la carte (api/outils.js pose
// `offre: outils` sur la session et sur l'abonnement) pour que l'ancien webhook,
// qui identifie les produits par leur montant, ne les traite pas : ils sont
// gérés par `stripe-webhook-outils`. Testée par tests/stripe-webhook-offre-outils.test.js.

const estOutils = (metadata) => metadata?.offre === 'outils'

// Session, abonnement ou facture : on cherche la marque aux endroits où Stripe
// la recopie, selon la version d'API de l'endpoint.
export function porteLaMarqueOutils(objet) {
  if (!objet) return false
  if (estOutils(objet.metadata)) return true
  if (estOutils(objet.subscription_details?.metadata)) return true
  if (estOutils(objet.parent?.subscription_details?.metadata)) return true
  return (objet.lines?.data || []).some(l => estOutils(l.metadata) || estOutils(l.parent?.subscription_item_details?.metadata))
}

// Facture : si la marque n'est pas sur la facture elle-même, on relit
// l'abonnement chez Stripe. `recupererAbonnement` : (id) => abonnement.
// Un abonnement introuvable (404) n'est pas un abonnement d'outils ; toute
// autre panne remonte pour que Stripe relivre l'événement.
export async function factureDesOutils(facture, recupererAbonnement) {
  if (porteLaMarqueOutils(facture)) return true
  const sub = facture?.subscription ?? facture?.parent?.subscription_details?.subscription
  const id = typeof sub === 'string' ? sub : sub?.id
  if (!id) return false
  try {
    return estOutils((await recupererAbonnement(id))?.metadata)
  } catch (err) {
    if (err?.statusCode === 404) return false
    throw err
  }
}
