import { supabase } from '../supabase'

const SUJETS = {
  analyse: (contenu) => `🎬 Ton analyse vidéo est prête !`,
  like: (contenu) => `❤️ ${contenu?.auteur || 'Quelqu\'un'} a aimé ta vidéo`,
  commentaire: (contenu) => `💬 Nouveau commentaire sur ta vidéo`,
  message: (contenu) => `✉️ Nouveau message de ${contenu?.auteur || 'quelqu\'un'}`,
}

export async function notifierJoueur({ type, userId, titre, contenu, lien }) {
  // 1. Toujours créer la notification dans la clochette
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    titre,
    contenu: contenu?.texte || null,
    lien: lien || '/dashboard',
  })

  // 2. Vérifier les préférences email (par défaut activé si pas de ligne)
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  const colonnePref = `email_${type}`
  const emailActive = !prefs || prefs[colonnePref] !== false

  if (!emailActive) return

  // 3. Récupérer l'email du joueur
  const { data: profil } = await supabase.from('profiles').select('email, prenom').eq('id', userId).single()
  if (!profil?.email) return

  // 4. Envoyer l'email via l'API
  try {
    await fetch('/api/send-player-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        to: profil.email,
        prenom: profil.prenom,
        titre,
        contenu: contenu?.texte,
        lien: lien || '/dashboard',
      }),
    })
  } catch (e) {
    console.error('Erreur notification email joueur:', e)
  }
}
