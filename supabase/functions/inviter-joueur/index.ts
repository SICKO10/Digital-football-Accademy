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

    const { email, educateur_id, equipe_joueur_id, prenom, nom } = await req.json()

    if (!email || !educateur_id || !equipe_joueur_id) {
      return new Response(
        JSON.stringify({ error: 'Champs manquants : email, educateur_id, equipe_joueur_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Seul l'éducateur propriétaire de cette ligne peut inviter pour elle.
    if (caller.id !== educateur_id) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 403, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Envoyer l'invitation via Supabase Auth
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        educateur_id,
        equipe_joueur_id,
        prenom,
        nom,
        plan: 'fan', // plan par défaut pour les joueurs invités
      },
      redirectTo: 'https://digital-football-accademy.vercel.app/accept-invite',
    })

    if (inviteError) {
      // Si l'utilisateur existe déjà, on peut quand même lier les comptes.
      // On cherche dans auth.users (pas profiles) : beaucoup de comptes auth.users n'ont
      // pas de ligne profiles correspondante (inscriptions abandonnées, etc.), donc chercher
      // par profiles.email loupe la plupart des comptes réels.
      if (inviteError.message?.includes('already been registered')) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
        const existingAuthUser = listData?.users?.find(u =>
          u.email?.toLowerCase() === email.toLowerCase()
        )

        if (existingAuthUser) {
          // affiliations/equipe_joueurs référencent profiles(id) via clé étrangère — si ce
          // compte auth existe sans ligne profiles (cas fréquent), il faut la créer d'abord
          // sinon les deux appels suivants échouent avec une violation de FK.
          const { data: profilExistant } = await supabaseAdmin.from('profiles').select('id').eq('id', existingAuthUser.id).maybeSingle()
          if (!profilExistant) {
            await supabaseAdmin.from('profiles').insert({
              id: existingAuthUser.id, email: existingAuthUser.email,
              prenom: prenom || '', nom: nom || '', plan: 'fan',
            })
          }

          await supabaseAdmin.from('affiliations').upsert({
            joueur_id: existingAuthUser.id,
            educateur_id,
            equipe_joueur_id,
            statut: 'accepte',
          }, { onConflict: 'joueur_id,educateur_id' })

          await supabaseAdmin
            .from('equipe_joueurs')
            .update({ email, joueur_id: existingAuthUser.id })
            .eq('id', equipe_joueur_id)

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

    // Stocker l'email dans equipe_joueurs pour traçabilité
    await supabaseAdmin
      .from('equipe_joueurs')
      .update({ email })
      .eq('id', equipe_joueur_id)

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
