/* global process */
import { Resend } from 'resend'
import { verifierJetonSupabase, authentifier, clientServiceSupabase } from './_securite.js'

// E-mail de notification à un joueur (like, commentaire, message, analyse…).
//
// Version sécurisée : auparavant l'endpoint acceptait un destinataire (`to`)
// et un contenu libres, sans authentification — n'importe qui pouvait
// envoyer des e-mails au nom de Digital Football à n'importe quelle adresse.
// Désormais :
//  - appelant authentifié (jeton Supabase vérifié) ;
//  - le navigateur ne transmet que l'identifiant du destinataire : son
//    e-mail et ses préférences de notification sont lus ICI (clé service) ;
//  - gabarits fixes, texte échappé et borné, lien limité au site ;
//  - limite d'envois par appelant.

const SITE = 'https://digitalfootball.academy'
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const RE_LIEN = /^\/[A-Za-z0-9/_\-?=&.]{0,120}$/

export const echapper = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

export const TEMPLATES = {
  analyse: (prenom) => ({
    subject: 'Ton analyse vidéo est prête',
    html: `<p>Salut ${prenom},</p><p>Notre coach vient de terminer l'analyse de ta vidéo. Connecte-toi à ton dashboard pour la consulter.</p>`,
  }),
  like: (prenom, contenu) => ({
    subject: 'Quelqu\'un a aimé ta vidéo',
    html: `<p>Salut ${prenom},</p><p>${contenu || 'Quelqu\'un'} a aimé une de tes vidéos sur Digital Football.</p>`,
  }),
  commentaire: (prenom, contenu) => ({
    subject: 'Nouveau commentaire sur ta vidéo',
    html: `<p>Salut ${prenom},</p><p>Tu as reçu un nouveau commentaire : « ${contenu} »</p>`,
  }),
  message: (prenom, contenu) => ({
    subject: 'Nouveau message',
    html: `<p>Salut ${prenom},</p><p>Tu as reçu un nouveau message : « ${contenu} »</p>`,
  }),
  analyse_seance: (prenom, contenu) => ({
    subject: 'Analyse de séance disponible',
    html: `<p>Salut ${prenom},</p><p>${contenu || 'Une séance a été analysée par un coach.'} Connecte-toi à ton dashboard pour la consulter.</p>`,
  }),
}

export function creerLimiteur({ max = 30, fenetreMs = 10 * 60 * 1000, maintenant = () => Date.now() } = {}) {
  const historique = new Map()
  return (cle) => {
    const t = maintenant()
    const recents = (historique.get(cle) || []).filter(x => t - x < fenetreMs)
    if (recents.length >= max) { historique.set(cle, recents); return false }
    recents.push(t)
    historique.set(cle, recents)
    if (historique.size > 5000) historique.clear()
    return true
  }
}

// Lecture du destinataire (injectable pour les tests).
export function donneesSupabase() {
  return {
    destinataire: async (userId, type) => {
      const db = clientServiceSupabase()
      const [{ data: profil, error: e1 }, { data: prefs, error: e2 }] = await Promise.all([
        db.from('profiles').select('email, prenom').eq('id', userId).maybeSingle(),
        db.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle(),
      ])
      if (e1 || e2) throw (e1 || e2)
      if (!profil?.email) return null
      // Par défaut activé si aucune préférence enregistrée (même règle qu'avant).
      const actif = !prefs || prefs[`email_${type}`] !== false
      return { email: profil.email, prenom: profil.prenom, actif }
    },
  }
}

export function envoyerResend({ to, subject, html }) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  return resend.emails.send({ from: 'Digital Football <notifications@digitalfootball.academy>', to, subject, html })
}

export function creerHandler({ verifierJeton, donnees, envoyer, limiteur = creerLimiteur() }) {
  return async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' })
    const utilisateur = await authentifier(req, res, verifierJeton)
    if (!utilisateur) return

    const { type, userId, contenu, lien } = req.body || {}
    if (!Object.prototype.hasOwnProperty.call(TEMPLATES, type) || typeof userId !== 'string' || !RE_UUID.test(userId)) {
      return res.status(400).json({ error: 'Type ou destinataire invalide' })
    }
    const lienSur = typeof lien === 'string' && RE_LIEN.test(lien) ? lien : '/dashboard'
    const contenuSur = echapper(String(contenu ?? '').slice(0, 300))

    if (!limiteur(utilisateur.id)) return res.status(429).json({ error: 'Trop de notifications envoyées, réessaie plus tard' })

    let dest
    try {
      dest = await donnees.destinataire(userId, type)
    } catch {
      return res.status(500).json({ error: 'Destinataire introuvable' })
    }
    if (!dest || !dest.actif) return res.status(200).json({ success: true, envoye: false })

    try {
      const { subject, html } = TEMPLATES[type](echapper(dest.prenom || 'Champion'), contenuSur)
      const resultat = await envoyer({
        to: dest.email,
        subject,
        html: `${html}<p style="margin-top:16px"><a href="${SITE}${echapper(lienSur)}">Voir sur Digital Football</a></p>`,
      })
      if (resultat?.error) throw new Error(resultat.error.message || 'envoi refusé')
      return res.status(200).json({ success: true, envoye: true })
    } catch (err) {
      console.error('Erreur envoi email joueur:', err?.message || err)
      return res.status(500).json({ error: 'Envoi impossible' })
    }
  }
}

export default creerHandler({ verifierJeton: verifierJetonSupabase, donnees: donneesSupabase(), envoyer: envoyerResend })
