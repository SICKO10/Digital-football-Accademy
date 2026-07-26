import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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

    const { email, educateur_id, permissions } = await req.json()

    if (!email || !educateur_id || !permissions) {
      return new Response(
        JSON.stringify({ error: 'Champs manquants : email, educateur_id, permissions requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Seul l'éducateur propriétaire peut inviter un dirigeant pour son propre compte.
    if (caller.id !== educateur_id) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 403, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { role: 'dirigeant', educateur_id, permissions },
      redirectTo: 'https://digital-football-accademy.vercel.app/accept-invite',
    })

    if (inviteError) {
      // Si l'utilisateur existe déjà, on lie directement l'accès plutôt que d'échouer.
      // On cherche dans auth.users (pas profiles) : beaucoup de comptes auth.users n'ont
      // pas de ligne profiles correspondante (inscriptions abandonnées, etc.).
      if (inviteError.message?.includes('already been registered')) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
        const existingAuthUser = listData?.users?.find(u =>
          u.email?.toLowerCase() === email.toLowerCase()
        )

        if (existingAuthUser) {
          // dirigeant_acces.dirigeant_id référence profiles(id) — s'assurer que la ligne existe.
          const { data: profilExistant } = await supabaseAdmin.from('profiles').select('id').eq('id', existingAuthUser.id).maybeSingle()
          if (!profilExistant) {
            await supabaseAdmin.from('profiles').insert({
              id: existingAuthUser.id, email: existingAuthUser.email, plan: 'fan',
            })
          }

          const { error: upsertError } = await supabaseAdmin.from('dirigeant_acces').upsert({
            educateur_id, email, permissions,
            dirigeant_id: existingAuthUser.id,
            statut: 'accepte',
          }, { onConflict: 'educateur_id,email' })
          if (upsertError) throw new Error(upsertError.message)

          return new Response(
            JSON.stringify({ success: true, linked: true, message: 'Compte existant lié directement' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Invitation envoyée à une adresse sans compte existant — la ligne reste en attente,
    // dirigeant_id sera renseigné par AcceptInvite.jsx quand le dirigeant créera son mot de passe.
    const { error: upsertError } = await supabaseAdmin.from('dirigeant_acces').upsert({
      educateur_id, email, permissions, statut: 'en_attente',
    }, { onConflict: 'educateur_id,email' })
    if (upsertError) throw new Error(upsertError.message)

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
