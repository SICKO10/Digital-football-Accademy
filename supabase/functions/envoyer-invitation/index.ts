import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: caller } } = await supabaseAuth.auth.getUser()
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: corsHeaders })
    }

    const { email, role, educateur_id, equipe_joueur_id, permissions, prenom, nom } = await req.json()

    if (!email || !role || !educateur_id) {
      return new Response(
        JSON.stringify({ error: 'Champs manquants : email, role, educateur_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!['joueur', 'dirigeant'].includes(role)) {
      return new Response(JSON.stringify({ error: 'role invalide' }), { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Seul l'éducateur propriétaire peut inviter. Pour un joueur, un dirigeant avec
    // édition sur "effectif" le peut aussi (même règle que l'ancien inviter-joueur) —
    // les dirigeants n'invitent en revanche jamais d'autres dirigeants.
    let autorise = caller.id === educateur_id
    if (!autorise && role === 'joueur') {
      const { data: acces } = await supabase
        .from('dirigeant_acces')
        .select('permissions')
        .eq('educateur_id', educateur_id)
        .eq('dirigeant_id', caller.id)
        .eq('statut', 'accepte')
        .maybeSingle()
      autorise = acces?.permissions?.effectif === 'edition'
    }
    if (!autorise) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 403, headers: corsHeaders })
    }

    // Utilisateur déjà enregistré ? On cherche dans auth.users (pas profiles) : beaucoup
    // de comptes auth.users n'ont pas de ligne profiles correspondante.
    const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const existingUser = listData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (existingUser) {
      const { data: profilExistant } = await supabase.from('profiles').select('id').eq('id', existingUser.id).maybeSingle()
      if (!profilExistant) {
        await supabase.from('profiles').insert({
          id: existingUser.id, email: existingUser.email, prenom: prenom || '', nom: nom || '', plan: 'fan',
        })
      }

      if (role === 'joueur' && equipe_joueur_id) {
        await supabase.from('affiliations').upsert({
          joueur_id: existingUser.id, educateur_id, equipe_joueur_id, statut: 'accepte',
        }, { onConflict: 'joueur_id,educateur_id' })

        await supabase.from('equipe_joueurs')
          .update({ joueur_id: existingUser.id, email })
          .eq('id', equipe_joueur_id)
      }

      if (role === 'dirigeant') {
        await supabase.from('dirigeant_acces').upsert({
          educateur_id, dirigeant_id: existingUser.id, email,
          statut: 'accepte', permissions: permissions || {},
        }, { onConflict: 'educateur_id,email' })
      }

      return new Response(
        JSON.stringify({ success: true, linked: true, message: 'Compte existant lié directement' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Nouvel utilisateur → créer l'invitation (token à nous, pas de magic link Supabase)
    const { data: invitation, error: invErr } = await supabase
      .from('invitations')
      .insert({
        email, role, educateur_id,
        equipe_joueur_id: equipe_joueur_id || null,
        permissions: permissions || null,
        prenom: prenom || null,
        nom: nom || null,
      })
      .select()
      .single()

    if (invErr) throw invErr

    // Traces "invitation en attente" côté UI éducateur — inchangées par rapport à
    // l'ancien flow, pour ne pas casser blocInvitationJoueur / la section Dirigeants.
    if (role === 'joueur' && equipe_joueur_id) {
      await supabase.from('equipe_joueurs').update({ email }).eq('id', equipe_joueur_id)
    }
    if (role === 'dirigeant') {
      await supabase.from('dirigeant_acces').upsert({
        educateur_id, email, permissions: permissions || {}, statut: 'en_attente',
      }, { onConflict: 'educateur_id,email' })
    }

    const { data: eduProfile } = await supabase
      .from('profiles')
      .select('prenom, nom')
      .eq('id', educateur_id)
      .single()

    const { data: profilEdu } = await supabase
      .from('profil_educateur')
      .select('club, categorie')
      .eq('user_id', educateur_id)
      .single()

    const nomEdu = eduProfile ? `${eduProfile.prenom} ${eduProfile.nom}` : 'Ton éducateur'
    const club = profilEdu?.club || 'le club'
    const categorie = profilEdu?.categorie ? ` (${profilEdu.categorie})` : ''
    const lienAccept = `https://digital-football-accademy.vercel.app/accept-invite?code=${invitation.token}`

    const sujetEmail = role === 'joueur'
      ? `Tu es invité à rejoindre ${club}${categorie} sur Digital Football`
      : `Tu es invité à rejoindre le staff de ${club}${categorie} sur Digital Football`

    const corpsEmail = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Inter,sans-serif;color:#fff;">
  <div style="max-width:480px;margin:40px auto;padding:32px;background:#111;border-radius:16px;border:1px solid #1a1a1a;">
    <h1 style="margin:0 0 4px;font-size:20px;">
      <span style="color:#fff;">Digital</span><span style="color:#4ade80;">Football</span>
    </h1>
    <p style="color:#555;font-size:12px;margin:0 0 28px;">La plateforme de coaching vidéo football</p>

    <h2 style="font-size:18px;font-weight:800;margin:0 0 12px;">
      ${role === 'joueur' ? '⚽ Rejoins ton équipe !' : '👔 Rejoins le staff !'}
    </h2>

    <p style="color:#ccc;font-size:14px;line-height:1.6;margin:0 0 24px;">
      ${nomEdu} t'invite à rejoindre <strong style="color:#fff;">${club}${categorie}</strong>
      ${role === 'joueur' ? 'en tant que joueur' : 'en tant que dirigeant'} sur Digital Football.
    </p>

    <a href="${lienAccept}"
       style="display:inline-block;background:#4ade80;color:#000;font-weight:800;font-size:15px;
              padding:14px 28px;border-radius:10px;text-decoration:none;">
      ${role === 'joueur' ? "Rejoindre l'équipe" : 'Rejoindre le staff'}
    </a>

    <p style="color:#333;font-size:11px;margin:24px 0 0;line-height:1.5;">
      Ce lien est valable 7 jours.<br>
      Si tu n'attendais pas cette invitation, ignore cet email.
    </p>
  </div>
</body>
</html>`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Digital Football <noreply@digitalfootball.academy>',
        to: [email],
        subject: sujetEmail,
        html: corpsEmail,
      }),
    })

    if (!resendRes.ok) {
      const resendErr = await resendRes.text()
      throw new Error(`Resend error: ${resendErr}`)
    }

    return new Response(
      JSON.stringify({ success: true, linked: false, message: 'Invitation envoyée' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
