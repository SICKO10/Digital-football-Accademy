import { supabase } from '../supabase'

// Appel de la fonction serveur api/outils.js avec le jeton de l'utilisateur.
// Rend { ok: true, ... } ou lève une Error au message lisible.
export async function appelerOutils(action, params = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Session expirée, reconnecte-toi')
  const res = await fetch('/api/outils', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ action, ...params }),
  })
  const corps = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(corps.error || 'Erreur, réessaie dans un instant')
  return corps
}

// Premier paiement (bloc 7) : crée la session Stripe Checkout et y envoie
// l'utilisateur. Les outils s'activent à la réception du paiement (webhook).
export async function payerOutils(params) {
  const { url } = await appelerOutils('payer', params)
  if (!url) throw new Error('Paiement indisponible pour le moment, réessaie plus tard')
  window.location.assign(url)
}

// Retour de la page de paiement Stripe (?outils=paye ou ?outils=annule), sinon null.
export function retourPaiementOutils() {
  if (typeof window === 'undefined') return null
  const v = new URLSearchParams(window.location.search).get('outils')
  return v === 'paye' || v === 'annule' ? v : null
}

// Retour du portail client Stripe (?outils=portail).
export function retourDuPortail() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('outils') === 'portail'
}

// Portail client Stripe : carte bancaire, factures, adresse de facturation.
export async function ouvrirPortail() {
  const { url } = await appelerOutils('portail')
  if (!url) throw new Error('Portail indisponible pour le moment, réessaie plus tard')
  window.location.assign(url)
}

export function effacerRetourPaiement() {
  const url = new URL(window.location.href)
  url.searchParams.delete('outils')
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
}
