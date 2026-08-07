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