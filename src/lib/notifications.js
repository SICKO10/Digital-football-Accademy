import { supabase } from '../supabase'

export async function notifierJoueur({ type, userId, titre, contenu, lien }) {
  // 1. Toujours créer la notification dans la clochette
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    titre,
    contenu: contenu?.texte || null,
    lien: lien || '/dashboard',
  })

  // 2. E-mail : le serveur retrouve lui-même l'adresse du destinataire et
  // vérifie ses préférences (api/send-player-email.js) — le navigateur ne
  // transmet que son identifiant, avec la session de l'expéditeur.
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    await fetch('/api/send-player-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ type, userId, contenu: contenu?.texte, lien: lien || '/dashboard' }),
    })
  } catch (e) {
    console.error('Erreur notification email joueur:', e)
  }
}
