import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const TEMPLATES = {
  analyse: (prenom, contenu) => ({
    subject: `🎬 Ton analyse vidéo est prête !`,
    html: `<p>Salut ${prenom},</p><p>Notre coach vient de terminer l'analyse de ta vidéo. Connecte-toi à ton dashboard pour la consulter.</p>`,
  }),
  like: (prenom, contenu) => ({
    subject: `❤️ Quelqu'un a aimé ta vidéo`,
    html: `<p>Salut ${prenom},</p><p>${contenu || 'Quelqu\'un'} a aimé une de tes vidéos sur Digital Football.</p>`,
  }),
  commentaire: (prenom, contenu) => ({
    subject: `💬 Nouveau commentaire sur ta vidéo`,
    html: `<p>Salut ${prenom},</p><p>Tu as reçu un nouveau commentaire : "${contenu || ''}"</p>`,
  }),
  message: (prenom, contenu) => ({
    subject: `✉️ Nouveau message`,
    html: `<p>Salut ${prenom},</p><p>Tu as reçu un nouveau message : "${contenu || ''}"</p>`,
  }),
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { type, to, prenom, contenu, lien } = req.body

  if (!to || !TEMPLATES[type]) {
    return res.status(400).json({ error: 'Type ou destinataire invalide' })
  }

  try {
    const { subject, html } = TEMPLATES[type](prenom || 'Champion', contenu)
    await resend.emails.send({
      from: 'Digital Football <notifications@digitalfootball.academy>',
      to,
      subject,
      html: html + `<p style="margin-top:16px"><a href="https://digital-football-accademy.vercel.app${lien || '/dashboard'}">Voir sur Digital Football →</a></p>`,
    })
    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Erreur envoi email joueur:', err)
    res.status(500).json({ error: err.message })
  }
}
