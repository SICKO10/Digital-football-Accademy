/* global process */
import { Resend } from 'resend'
import { verifierJetonSupabase, authentifier, clientServiceSupabase } from './_securite.js'

const resend = new Resend(process.env.RESEND_API_KEY)

// Notification des coachs analyseurs (nouvelle demande d'analyse, séance
// transférée par un club). Les destinataires sont TOUJOURS calculés ici
// (table admins_coach) : la liste n'est plus fournie par le navigateur — qui
// ne peut plus lire l'email des autres comptes — et l'endpoint ne peut donc
// pas servir à écrire à une adresse arbitraire. Appelant authentifié.
export default async function handler(req, res) {
  const utilisateur = await authentifier(req, res, verifierJetonSupabase)
  if (!utilisateur) return

  const { type, joueurNom, clubNom, theme } = req.body || {}

  let coachEmails = []
  try {
    const db = clientServiceSupabase()
    const { data: admins, error: e1 } = await db.from('admins_coach').select('user_id')
    if (e1) throw e1
    const ids = (admins || []).map(a => a.user_id).filter(Boolean)
    if (ids.length) {
      const { data: profils, error: e2 } = await db.from('profiles').select('email').in('id', ids)
      if (e2) throw e2
      coachEmails = (profils || []).map(p => p.email).filter(Boolean)
    }
  } catch {
    return res.status(500).json({ error: 'Destinataires introuvables' })
  }
  if (coachEmails.length === 0) return res.status(200).json({ success: true, envoyes: 0 })

  try {
    const subject = type === 'demande'
      ? `🎬 Nouvelle demande d'analyse — ${joueurNom}`
      : `🎥 Nouvelle séance à analyser — ${clubNom}`

    const html = type === 'demande'
      ? `<p><strong>${joueurNom}</strong> vient d'envoyer une nouvelle vidéo pour analyse.</p><p>Connecte-toi à ton dashboard pour la traiter.</p>`
      : `<p><strong>${clubNom}</strong> t'a transféré une séance de <strong>${theme || 'entraînement'}</strong> pour évaluation.</p><p>Connecte-toi à ton dashboard, onglet "Séances club", pour la traiter.</p>`

    await resend.emails.send({
      from: 'Digital Football <notifications@digitalfootball.academy>',
      to: coachEmails,
      subject,
      html,
    })

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Erreur envoi email:', err)
    res.status(500).json({ error: err.message })
  }
}
