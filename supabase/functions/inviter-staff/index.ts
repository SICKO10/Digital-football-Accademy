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

    const { email, role, clubId, clubNom } = await req.json()
    if (!email || !role || !clubId) {
      return new Response(JSON.stringify({ error: 'email, role et clubId sont requis' }), { status: 400, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Seul le club lui-même ou un membre de son staff peut inviter.
    const estClub = caller.id === clubId
    let estStaff = false
    if (!estClub) {
      const { data } = await supabaseAdmin.from('staff_club').select('id').eq('club_id', clubId).eq('user_id', caller.id).maybeSingle()
      estStaff = !!data
    }
    if (!estClub && !estStaff) {
      return new Response(JSON.stringify({ error: 'Non autorisé à inviter du staff pour ce club' }), { status: 403, headers: corsHeaders })
    }

    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { role_invite: role, club_id: clubId, club_nom: clubNom },
      redirectTo: 'https://digital-football-accademy.vercel.app/accept-invite',
    })

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
