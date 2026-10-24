/* global process */
import { Resend } from 'resend'
import { clientServiceSupabase } from './_securite.js'

// E-mail de confirmation d'inscription à un stage (module Stages, étape 3).
//
// Appelé par la page d'inscription publique juste après inscrire_stage(),
// SANS compte. Garde-fous, pour que cet endpoint ne puisse pas servir de
// relais d'e-mails :
//  - il ne reçoit que (lien du stage, référence d'inscription) : ni
//    destinataire ni contenu ne viennent du navigateur ;
//  - le destinataire est l'e-mail enregistré dans l'inscription, le contenu
//    est construit uniquement à partir de la base ;
//  - un seul envoi par inscription (réservation atomique de
//    confirmation_envoyee_le), et seulement dans l'heure qui suit
//    l'inscription ;
//  - tout le texte inséré dans le HTML est échappé.

const RE_LIEN = /^[0-9a-f-]{16,64}$/i
const RE_REF = /^[0-9A-F]{8}$/
const MODES = { virement: 'Virement', cheque: 'Chèque', especes: 'Espèces' }

const echapper = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const dateFr = (s, options) => { const [a, m, j] = s.split('-').map(Number); return new Date(Date.UTC(a, m - 1, j)).toLocaleDateString('fr-FR', { timeZone: 'UTC', ...options }) }
const euros = (n) => `${Number(n || 0).toFixed(2).replace('.', ',')} €`

export function construireEmail({ stage, club, inscription, offre, formule, urlStage }) {
  const jours = (inscription.jours || []).map(j => dateFr(j, { weekday: 'long', day: 'numeric', month: 'long' })).join(', ')
  const aPayer = Number(inscription.montant_du) > 0
  const ligne = (k, v) => `<tr><td style="padding:4px 12px 4px 0;color:#666">${k}</td><td style="padding:4px 0"><strong>${v}</strong></td></tr>`
  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#111">
  <p style="font-size:13px;color:#666;margin:0 0 4px">${echapper(club?.club || 'Votre club')}</p>
  <h1 style="font-size:20px;margin:0 0 16px">Inscription enregistrée : ${echapper(stage.nom)}</h1>
  <p>Bonjour,</p>
  <p>L'inscription de <strong>${echapper(inscription.prenom)} ${echapper(inscription.nom)}</strong> au stage
  <strong>${echapper(stage.nom)}</strong>${stage.lieu ? ` (${echapper(stage.lieu)})` : ''} est bien enregistrée.</p>
  <table style="border-collapse:collapse;font-size:14px;margin:12px 0">
    ${ligne('Référence', echapper(inscription.reference))}
    ${ligne('Jours', echapper(jours))}
    ${offre ? ligne('Offre', echapper(offre.nom)) : ''}
    ${formule ? ligne('Repas', echapper(formule.nom)) : ''}
    ${ligne('Montant', echapper(euros(inscription.montant_du)))}
  </table>
  ${aPayer ? `
  <h2 style="font-size:16px;margin:20px 0 6px">Paiement</h2>
  <p style="margin:0 0 6px">L'inscription sera définitive à réception du paiement par le club.
  Modes acceptés : ${echapper((stage.modes_paiement || []).map(m => MODES[m] || m).join(', '))}.</p>
  ${stage.instructions_paiement ? `<p style="white-space:pre-line;margin:0 0 6px">${echapper(stage.instructions_paiement)}</p>` : ''}
  <p style="margin:0">Merci d'indiquer la référence <strong>${echapper(inscription.reference)}</strong> avec votre paiement.</p>` : ''}
  <p style="margin:20px 0 0"><a href="${echapper(urlStage)}" style="color:#16a34a">Voir le programme du stage</a></p>
  <p style="font-size:12px;color:#888;margin-top:24px">Pour toute question, répondez directement à cet e-mail : il sera transmis au club.</p>
</div>`
  return { sujet: `Inscription au stage « ${stage.nom} » — ${inscription.prenom}`, html }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' })
  const { lien, reference } = req.body || {}
  if (typeof lien !== 'string' || !RE_LIEN.test(lien) || typeof reference !== 'string' || !RE_REF.test(reference)) {
    return res.status(400).json({ error: 'Requête invalide' })
  }
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'Envoi indisponible' })

  try {
    const db = clientServiceSupabase()
    const { data: stage, error: e1 } = await db.from('stages')
      .select('id, nom, lieu, lien_public, modes_paiement, instructions_paiement, club_id')
      .eq('lien_public', lien).maybeSingle()
    if (e1) throw e1
    if (!stage) return res.status(200).json({ envoye: false })

    // Réservation atomique : une seule requête peut passer pour cette inscription.
    const ilYaUneHeure = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: inscription, error: e2 } = await db.from('stages_inscriptions')
      .update({ confirmation_envoyee_le: new Date().toISOString() })
      .eq('stage_id', stage.id).eq('reference', reference)
      .is('confirmation_envoyee_le', null).gte('created_at', ilYaUneHeure)
      .select('id, prenom, nom, email_parent, jours, montant_du, offre_id, formule_repas_id, reference')
      .maybeSingle()
    if (e2) throw e2
    if (!inscription) return res.status(200).json({ envoye: false })

    const [{ data: club }, { data: offre }, { data: formule }] = await Promise.all([
      db.from('profiles').select('club, email').eq('id', stage.club_id).maybeSingle(),
      inscription.offre_id ? db.from('stages_offres').select('nom').eq('id', inscription.offre_id).maybeSingle() : Promise.resolve({ data: null }),
      inscription.formule_repas_id ? db.from('stages_formules_repas').select('nom').eq('id', inscription.formule_repas_id).maybeSingle() : Promise.resolve({ data: null }),
    ])

    const urlStage = `https://digitalfootball.academy/stage/${stage.lien_public}`
    const { sujet, html } = construireEmail({ stage, club, inscription, offre, formule, urlStage })
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error: e3 } = await resend.emails.send({
      from: `${(club?.club || 'Digital Football').replace(/[<>"]/g, '')} via Digital Football <notifications@digitalfootball.academy>`,
      to: inscription.email_parent,
      ...(club?.email ? { replyTo: club.email } : {}),
      subject: sujet,
      html,
    })
    if (e3) {
      // Échec d'envoi : on libère la réservation pour permettre un nouvel essai.
      await db.from('stages_inscriptions').update({ confirmation_envoyee_le: null }).eq('id', inscription.id)
      return res.status(502).json({ error: 'Envoi impossible' })
    }
    return res.status(200).json({ envoye: true })
  } catch (err) {
    console.error('stage-confirmation:', err?.message || err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
}
