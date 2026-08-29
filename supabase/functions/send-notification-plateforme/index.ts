import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Même liste que les policies RLS de notifications_plateforme (cf.
// supabase_notifications_plateforme.sql) et lib/coachAdmin.js côté front —
// à garder synchronisée si cette liste change.
const ADMIN_EMAILS = ['legacyattitude@gmail.com', 'januariojimmy@gmail.com']

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
    if (!caller || !ADMIN_EMAILS.includes(caller.email || '')) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 403, headers: corsHeaders })
    }

    const { notification_id, titre, contenu, destinataires } = await req.json()

    if (!titre || !contenu || !Array.isArray(destinataires)) {
      return new Response(
        JSON.stringify({ error: 'Champs manquants : titre, contenu, destinataires requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const emailHtml = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Inter,sans-serif;">
  <div style="max-width:480px;margin:40px auto;padding:32px;background:#111;border-radius:16px;border:1px solid #1a1a1a;color:#fff;">
    <div style="color:#4ade80;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Digital Football</div>
    <h1 style="color:#fff;font-size:22px;margin:0 0 20px;">${titre}</h1>
    <div style="color:#aaa;font-size:14px;line-height:1.6;white-space:pre-wrap;">${contenu}</div>
    <p style="color:#333;font-size:11px;margin:32px 0 0;padding-top:20px;border-top:1px solid #222;">
      Digital Football · Ce message t'a été envoyé par l'équipe Digital Football
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
            subject: `[Digital Football] ${titre}`,
            html: emailHtml,
          }),
        }).then(res => { if (!res.ok) throw new Error(`Resend error (${dest.email}): ${res.status}`) })
      )
    )

    const envoyes = results.filter(r => r.status === 'fulfilled').length
    const erreurs = results.filter(r => r.status === 'rejected').length

    if (notification_id) {
      await supabase.from('notifications_plateforme').update({ envoye_email: true }).eq('id', notification_id)
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
