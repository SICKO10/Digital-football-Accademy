// Détecte un signUp() qui échoue parce que l'email a déjà un compte — deux
// signaux possibles côté Supabase : soit une erreur explicite ("User already
// registered", selon la version/config du projet), soit — quand "Confirm
// email" est activé — un succès silencieux avec data.user.identities vide,
// mécanisme volontaire de Supabase pour empêcher l'énumération d'emails.
export function emailDejaUtilise(error, data) {
  if (error) return /already registered|already exists|already been registered/i.test(error.message)
  return !!data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0
}
