import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { type, coachEmails, joueurNom, clubNom, theme } = req.body

  if (!coachEmails || coachEmails.length === 0) {
    return res.status(400).json({ error: 'Aucun email coach fourni' })
  }

  try {
    const subject = type === 'demande'
      ? `🎬 Nouvelle demande d'analyse — ${joueurNom}`
      : `🎥 Nouvelle séance à analyser — ${clubNom}`

    const html = type === 'demande'
      ? `<p><strong>${joueurNom}</strong> vient d'envoyer une nouvelle vidéo pour analyse.</p><p>Connecte-toi à ton dashboard pour la traiter.</p>`
      : `<p><strong>${clubNom}</strong> t'a transféré une séance de <strong>${theme || 'entraînement'}</strong> pour évaluation.</p><p>Connecte-toi à ton dashboard, onglet "Séances club", pour la traiter.</p>`

    await resend.emails.send({
      from: 'Digital Football <onboarding@resend.dev>',
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
