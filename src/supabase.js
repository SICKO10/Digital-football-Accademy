import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// detectSessionInUrl désactivé : sans ça, le client échange automatiquement les
// tokens d'invitation/recovery présents dans l'URL dès le chargement de la page —
// exactement ce qui permet aux scanners de liens (Outlook Safe Links, Gmail,
// Apple Mail) de consommer un lien à usage unique avant que l'utilisateur clique.
// Voir src/pages/AcceptInvite.jsx, qui échange le token manuellement au clic.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { detectSessionInUrl: false },
})

// supabase.auth.signOut() renvoie une 403 si appelée sans session valide (déjà
// expirée, ou déjà déconnectée par un double-clic/un autre onglet) — vérifier
// la session avant l'appel évite cette erreur bruyante en console sans
// changer le comportement pour l'utilisateur (il est de toute façon déjà
// déconnecté dans ce cas).
export const signOutSafe = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) await supabase.auth.signOut()
}

// Un onglet resté ouvert longtemps (ex: rédaction d'une fiche séance) peut
// voir son token expirer sans que le rafraîchissement automatique du SDK
// n'ait eu le temps de se déclencher — les navigateurs limitent les timers
// des onglets en arrière-plan. Résultat : un insert/update échoue avec une
// erreur "row-level security" qui n'a rien à voir avec les policies, le vrai
// problème est un token expiré (auth.uid() devient NULL côté serveur). À
// appeler juste avant une écriture critique pour forcer un rafraîchissement
// si le token expire dans moins de 2 minutes.
export const assurerSessionFraiche = async () => {
  const { data } = await supabase.auth.getSession()
  const expiresAt = data.session?.expires_at
  if (!expiresAt || expiresAt - Date.now() / 1000 < 120) {
    await supabase.auth.refreshSession()
  }
}

// Enveloppe un appel Supabase critique (insert/update) : si la réponse
// échoue avec le symptôme classique d'une session expirée (401, ou le
// message "row-level security" alors que la policy elle-même est correcte),
// tente un rafraîchissement de session puis rejoue l'appel une seule fois
// avant d'abandonner — évite de perdre un contenu en cours de rédaction à
// cause d'un token expiré pendant une longue session d'édition.
export const avecRetrySession = async (appel) => {
  const resultat = await appel()
  if (!resultat.error) return resultat
  const estErreurAuth = resultat.error.code === '401' || resultat.error.code === 'PGRST301' || /row-level security|jwt/i.test(resultat.error.message || '')
  if (!estErreurAuth) return resultat
  await supabase.auth.refreshSession()
  return appel()
}