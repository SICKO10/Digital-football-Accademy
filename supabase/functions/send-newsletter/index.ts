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

    const { annonce_id, club_id, titre, contenu, destinataires } = await req.json()

    if (!club_id || !titre || !contenu || !Array.isArray(destinataires)) {
      return new Response(
        JSON.stringify({ error: 'Champs manquants : club_id, titre, contenu, destinataires requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Seul le club lui-même (ou un membre de son staff) peut déclencher un envoi
    // groupé — même règle que club_id sur inviter-staff/envoyer-invitation.
    let autorise = caller.id === club_id
    if (!autorise) {
      const { data: staffRow } = await supabase.from('staff_club').select('id').eq('club_id', club_id).eq('user_id', caller.id).maybeSingle()
      autorise = !!staffRow
    }
    if (!autorise) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 403, headers: corsHeaders })
    }

    const { data: clubProfile } = await supabase.from('profiles').select('club').eq('id', club_id).maybeSingle()
    const club = clubProfile?.club || 'Ton club'

    const emailHtml = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Inter,sans-serif;">
  <div style="max-width:480px;margin:40px auto;padding:32px;background:#111;border-radius:16px;border:1px solid #1a1a1a;color:#fff;">
    <div style="color:#4ade80;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">${club}</div>
    <h1 style="color:#fff;font-size:22px;margin:0 0 20px;">${titre}</h1>
    <div style="color:#aaa;font-size:14px;line-height:1.6;white-space:pre-wrap;">${contenu}</div>
    <p style="color:#333;font-size:11px;margin:32px 0 0;padding-top:20px;border-top:1px solid #222;">
      Digital Football · Ce message t'a été envoyé par ${club}
    </p>
  </div>
</body>
</html>`

    const results = await Promise.allSettled(
      destinataires.map((dest: { email: string; nom?: string }) =>
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Digital Football <noreply@digitalfootball.academy>',
            to: dest.email,
            subject: `[${club}] ${titre}`,
            html: emailHtml,
          }),
        }).then(res => { if (!res.ok) throw new Error(`Resend error (${dest.email}): ${res.status}`) })
      )
    )

    const envoyes = results.filter(r => r.status === 'fulfilled').length
    const erreurs = results.filter(r => r.status === 'rejected').length

    if (annonce_id) {
      await supabase.from('annonces_club').update({ envoye_email: true }).eq('id', annonce_id).eq('club_id', club_id)
    }

    return new Response(JSON.stringify({ success: true, envoyes, erreurs }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
