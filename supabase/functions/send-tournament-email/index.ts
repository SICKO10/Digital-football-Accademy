import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enveloppe HTML commune aux emails ci-dessous — même gabarit que
// envoyer-invitation/index.ts (fond sombre, pas de dépendance au thème de
// l'app puisqu'un client email ne charge pas nos CSS/JS). `lienSecondaire`
// optionnel pour le mail joueur (suivre le tournoi sans créer de compte).
function enveloppe(titre: string, corps: string, lien: string, bouton: string, lienSecondaire?: { lien: string; texte: string }) {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Inter,sans-serif;color:#fff;">
  <div style="max-width:480px;margin:40px auto;padding:32px;background:#111;border-radius:16px;border:1px solid #1a1a1a;">
    <h1 style="margin:0 0 4px;font-size:20px;">
      <span style="color:#fff;">Digital</span><span style="color:#4ade80;">Football</span>
    </h1>
    <p style="color:#555;font-size:12px;margin:0 0 28px;">Tournois</p>

    <h2 style="font-size:18px;font-weight:800;margin:0 0 12px;">${titre}</h2>

    <div style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 24px;">${corps}</div>

    <a href="${lien}"
       style="display:inline-block;background:#4ade80;color:#000;font-weight:800;font-size:15px;
              padding:14px 28px;border-radius:10px;text-decoration:none;">
      ${bouton}
    </a>
    ${lienSecondaire ? `<div style="margin-top:16px;"><a href="${lienSecondaire.lien}" style="color:#4ade80;font-size:13px;text-decoration:none;">${lienSecondaire.texte}</a></div>` : ''}
  </div>
</body>
</html>`
}

async function envoyerEmail(to: string, sujet: string, html: string) {
  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Digital Football <noreply@digitalfootball.academy>',
      to: [to],
      subject: sujet,
      html,
    }),
  })
  if (!resendRes.ok) {
    const err = await resendRes.text()
    throw new Error(`Resend error (${to}): ${err}`)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { inscription_id } = await req.json()
    if (!inscription_id) {
      return new Response(JSON.stringify({ error: 'Champ manquant : inscription_id requis' }), { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: inscription, error: fetchErr } = await supabase
      .from('tournois_inscriptions')
      .select('*, tournois_inscriptions_joueurs(*), tournois_organises(*)')
      .eq('id', inscription_id)
      .single()

    if (fetchErr || !inscription) throw new Error('Inscription introuvable')

    const tournoi = inscription.tournois_organises
    const joueurs = inscription.tournois_inscriptions_joueurs || []
    const dateStr = tournoi.date
      ? new Date(tournoi.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : ''
    const lienTournoi = `https://digitalfootball.academy/tournoi/${tournoi.code_public}`

    let envoyes = 0
    const erreurs: string[] = []

    // Email de confirmation au référent de l'équipe.
    if (inscription.email_referent) {
      const corps = `
        Bonjour <strong style="color:#fff;">${inscription.nom_referent || ''}</strong>,<br><br>
        L'inscription de <strong style="color:#fff;">${inscription.nom_club}</strong> au tournoi
        <strong style="color:#fff;">${tournoi.nom}</strong> a été validée par l'organisateur.<br><br>
        ${dateStr ? `${dateStr}<br>` : ''}
        ${tournoi.lieu ? `${tournoi.lieu}<br>` : ''}
        ${tournoi.prix_inscription_equipe > 0 ? `${tournoi.prix_inscription_equipe}€ — mode de paiement : ${inscription.mode_paiement}<br>` : ''}
        <br>${joueurs.length} joueur${joueurs.length > 1 ? 's' : ''} enregistré${joueurs.length > 1 ? 's' : ''}.
      `
      const lienVote = `https://digitalfootball.academy/tournoi/${tournoi.code_public}/voter/${inscription.code_confirmation}`
      try {
        await envoyerEmail(
          inscription.email_referent,
          `Inscription confirmée — ${tournoi.nom}`,
          enveloppe('Inscription confirmée', corps, lienTournoi, 'Suivre le tournoi en direct', { lien: lienVote, texte: 'Voter pour les distinctions du tournoi' })
        )
        envoyes++
      } catch (e) {
        console.error('[send-tournament-email] référent:', e.message)
        erreurs.push(e.message)
      }
    }

    // Un email à chaque joueur ayant renseigné une adresse — pousse vers la
    // création d'un compte Digital Football (sans prétendre le pré-remplir :
    // /register ne lit aujourd'hui ni prénom/nom ni code tournoi en query
    // params, cf. Register.jsx — un lien qui le prétendrait mentirait).
    for (const joueur of joueurs) {
      if (!joueur.email) continue
      const corps = `
        Salut <strong style="color:#fff;">${joueur.prenom}</strong>,<br><br>
        Tu participes au tournoi <strong style="color:#fff;">${tournoi.nom}</strong> avec
        <strong style="color:#fff;">${inscription.nom_club}</strong>${joueur.numero_maillot ? ` (n°${joueur.numero_maillot})` : ''}.<br><br>
        ${dateStr ? `${dateStr}<br>` : ''}
        ${tournoi.lieu ? `${tournoi.lieu}<br>` : ''}
        <br>Crée ton compte Digital Football pour retrouver tes stats du tournoi et ta carte saison.
      `
      try {
        await envoyerEmail(
          joueur.email,
          `${tournoi.nom} — tu es inscrit`,
          enveloppe('Tu es inscrit !', corps, 'https://digitalfootball.academy/register', 'Créer mon compte (gratuit)', { lien: lienTournoi, texte: 'Ou suivre le tournoi sans compte' })
        )
        envoyes++
      } catch (e) {
        console.error('[send-tournament-email] joueur:', e.message)
        erreurs.push(e.message)
      }
    }

    return new Response(
      JSON.stringify({ success: true, emails_envoyes: envoyes, erreurs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[send-tournament-email]', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
