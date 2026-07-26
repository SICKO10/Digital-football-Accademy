import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Toutes les opérations passent par le service role : la table `invitations` n'a
// volontairement aucune policy de lecture publique (un token = un accès direct au
// compte concerné, elle ne doit jamais être listable via la clé anon), et les
// écritures qui suivent (profils, affiliations, dirigeant_acces) ne peuvent pas
// s'appuyer sur la RLS classique "auth.uid() = educateur_id" puisque c'est le
// nouvel utilisateur, pas l'éducateur, qui doit pouvoir les créer. Le serveur
// vérifie donc lui-même la validité du token avant d'agir avec des droits élevés.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const { action, token, password } = await req.json()

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token manquant' }), { status: 400, headers: corsHeaders })
    }

    const { data: inv, error: invErr } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .maybeSingle()

    if (invErr) throw invErr
    if (!inv) {
      return new Response(JSON.stringify({ error: 'Invitation introuvable.' }), { status: 404, headers: corsHeaders })
    }
    if (inv.statut === 'accepte') {
      return new Response(JSON.stringify({ error: 'Cette invitation a déjà été utilisée.' }), { status: 400, headers: corsHeaders })
    }
    if (new Date(inv.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Cette invitation a expiré. Demande à ton éducateur d'en envoyer une nouvelle." }), { status: 400, headers: corsHeaders })
    }

    // Récupère aussi le contexte club/éducateur pour l'affichage (aperçu), utilisé
    // par AcceptInvite.jsx avant que l'utilisateur ne saisisse un mot de passe.
    const [{ data: eduProfile }, { data: profilEdu }] = await Promise.all([
      supabase.from('profiles').select('prenom, nom').eq('id', inv.educateur_id).single(),
      supabase.from('profil_educateur').select('club, categorie').eq('user_id', inv.educateur_id).single(),
    ])

    if (action === 'lire' || !action) {
      return new Response(
        JSON.stringify({
          success: true,
          email: inv.email,
          role: inv.role,
          prenom: inv.prenom,
          nom: inv.nom,
          club: profilEdu?.club || null,
          categorie: profilEdu?.categorie || null,
          nomEdu: eduProfile ? `${eduProfile.prenom} ${eduProfile.nom}` : null,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'accepter') {
      if (!password || password.length < 6) {
        return new Response(JSON.stringify({ error: 'Mot de passe trop court (6 caractères minimum).' }), { status: 400, headers: corsHeaders })
      }

      // En théorie déjà exclu par envoyer-invitation (les comptes existants sont liés
      // directement sans passer par la table invitations), mais on reste défensif.
      const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      let userId = listData?.users?.find(u => u.email?.toLowerCase() === inv.email.toLowerCase())?.id

      if (!userId) {
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email: inv.email,
          password,
          email_confirm: true,
          user_metadata: { prenom: inv.prenom || '', nom: inv.nom || '', role: inv.role },
        })
        if (createErr) throw createErr
        userId = created.user.id
      }

      const { data: profilExistant } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle()
      if (!profilExistant) {
        const { error: errProfilInsert } = await supabase.from('profiles').insert({
          id: userId, email: inv.email, prenom: inv.prenom || '', nom: inv.nom || '', plan: 'fan',
        })
        if (errProfilInsert) throw errProfilInsert
      }

      if (inv.role === 'joueur' && inv.equipe_joueur_id) {
        const { error: errAff } = await supabase.from('affiliations').upsert({
          joueur_id: userId, educateur_id: inv.educateur_id, equipe_joueur_id: inv.equipe_joueur_id, statut: 'accepte',
        }, { onConflict: 'joueur_id,educateur_id' })
        if (errAff) throw errAff

        const { error: errEquipe } = await supabase.from('equipe_joueurs')
          .update({ joueur_id: userId })
          .eq('id', inv.equipe_joueur_id)
        if (errEquipe) throw errEquipe
      }

      if (inv.role === 'dirigeant') {
        const { error: errDirigeant } = await supabase.from('dirigeant_acces').upsert({
          educateur_id: inv.educateur_id, dirigeant_id: userId, email: inv.email,
          statut: 'accepte', permissions: inv.permissions || {},
        }, { onConflict: 'educateur_id,email' })
        if (errDirigeant) throw errDirigeant
      }

      const { error: errInvUpdate } = await supabase.from('invitations').update({ statut: 'accepte' }).eq('id', inv.id)
      if (errInvUpdate) throw errInvUpdate

      return new Response(
        JSON.stringify({ success: true, email: inv.email, role: inv.role }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ error: 'action invalide' }), { status: 400, headers: corsHeaders })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
