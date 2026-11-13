import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Même constante que dans envoyer-invitation — dupliquée plutôt que
// partagée via un module commun (chaque edge function est déployée
// indépendamment, cf. convention déjà en place dans ce projet).
const PARENT_PERMISSIONS_DEFAUT = {
  profil: 'lecture', videos: 'lecture', competition: 'lecture', physique: 'lecture',
  planning: 'lecture', notes: 'lecture', analyses: 'lecture', recruteurs: 'lecture',
}

// Club plein : message pour l'éducateur invité (le club, lui, est prévenu par
// envoyer-invitation et par son écran). L'invitation n'est pas consommée.
const reponseLimiteEducateurs = (places: number) => new Response(
  JSON.stringify({
    error: "Ce club a atteint la limite d'éducateurs de son forfait. Préviens le club : dès qu'il aura une place libre ou un forfait supérieur, ce même lien fonctionnera.",
    limite_educateurs: places,
  }),
  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
)

// Toutes les opérations passent par le service role : la table `invitations` n'a
// volontairement aucune policy de lecture publique (un token = un accès direct au
// compte concerné, elle ne doit jamais être listable via la clé anon), et les
// écritures qui suivent (profils, affiliations, dirigeant_acces, parents_acces) ne
// peuvent pas s'appuyer sur la RLS classique "auth.uid() = educateur_id" puisque
// c'est le nouvel utilisateur, pas l'éducateur/joueur, qui doit pouvoir les créer.
// Le serveur vérifie donc lui-même la validité du token avant d'agir avec des
// droits élevés.
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

    // Contexte pour l'affichage (aperçu), utilisé par AcceptInvite.jsx avant que
    // l'utilisateur ne saisisse un mot de passe — différent pour un parent (pas
    // d'éducateur/club, le contexte c'est le joueur qui invite).
    let nomEdu = null
    let club = null
    let categorie = null
    if (inv.role === 'parent') {
      const { data: joueurProfile } = await supabase.from('profiles').select('prenom, nom').eq('id', inv.joueur_id).maybeSingle()
      nomEdu = joueurProfile ? `${joueurProfile.prenom} ${joueurProfile.nom}` : null
    } else if (inv.role === 'club') {
      // Rien à afficher ici : l'invitation vient du webhook Stripe après
      // paiement, pas d'un éducateur ni d'un joueur (educateur_id/joueur_id
      // sont null pour ce rôle).
    } else if (inv.role === 'educateur') {
      const { data: clubProfile } = await supabase.from('profiles').select('club').eq('id', inv.club_id).maybeSingle()
      club = clubProfile?.club || null
    } else {
      const [{ data: eduProfile }, { data: profilEdu }] = await Promise.all([
        supabase.from('profiles').select('prenom, nom').eq('id', inv.educateur_id).maybeSingle(),
        supabase.from('profil_educateur').select('club, categorie').eq('user_id', inv.educateur_id).maybeSingle(),
      ])
      nomEdu = eduProfile ? `${eduProfile.prenom} ${eduProfile.nom}` : null
      club = profilEdu?.club || null
      categorie = profilEdu?.categorie || null
    }

    if (action === 'lire' || !action) {
      return new Response(
        JSON.stringify({
          success: true,
          email: inv.email,
          role: inv.role,
          prenom: inv.prenom,
          nom: inv.nom,
          club,
          categorie,
          nomEdu,
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

      // Club du nouveau modèle plein : on s'arrête AVANT de créer le compte, et
      // l'invitation reste valable (le club peut monter de forfait, puis le même
      // lien refonctionne). Réponse en 200 avec `error` pour que AcceptInvite.jsx
      // puisse afficher le message (le navigateur ne lit que les corps 2xx).
      if (inv.role === 'educateur') {
        const { data: placesPleines } = await supabase.rpc('limite_educateurs_atteinte', { p_club: inv.club_id, p_educateur: userId || null })
        if (placesPleines != null) return reponseLimiteEducateurs(placesPleines)
      }

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
        // 'educateur' pour ce rôle (la contrainte CHECK sur profiles.plan
        // n'accepte 'fan' que pour les comptes joueur), 'fan' par défaut sinon.
        const { error: errProfilInsert } = await supabase.from('profiles').insert({
          id: userId, email: inv.email, prenom: inv.prenom || '', nom: inv.nom || '',
          plan: inv.role === 'educateur' ? 'educateur' : 'fan',
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

      if (inv.role === 'parent') {
        // profil_parent n'est PAS créé ici : la modale obligatoire (prénom, nom,
        // téléphone, profession) s'affiche à la première connexion réelle sur
        // DashboardParent.jsx, cf. profil_complet = false.
        const { error: errParent } = await supabase.from('parents_acces').upsert({
          joueur_id: inv.joueur_id, parent_id: userId, email_invite: inv.email, statut: 'accepte',
          permissions: PARENT_PERMISSIONS_DEFAUT,
        }, { onConflict: 'joueur_id,email_invite' })
        if (errParent) throw errParent
      }

      if (inv.role === 'educateur') {
        const { error: errEducateur } = await supabase.from('club_educateurs').upsert({
          club_id: inv.club_id, educateur_id: userId, statut: 'accepte', methode: 'invite',
        }, { onConflict: 'club_id,educateur_id' })
        if (errEducateur) throw errEducateur

        // Comme pour le rôle 'club' plus bas : on force le plan même si le
        // profil existait déjà avant l'invitation (ex. compte joueur créé
        // en premier), sinon la personne reste coincée sur son ancien
        // dashboard malgré l'affiliation club_educateurs acceptée.
        const { error: errPlanEducateur } = await supabase.from('profiles').update({ plan: 'educateur' }).eq('id', userId)
        if (errPlanEducateur) throw errPlanEducateur
      }

      if (inv.role === 'club') {
        // Le paiement a déjà eu lieu (l'invitation n'est créée par le webhook
        // Stripe qu'après checkout.session.completed) — on écrase le plan='fan'
        // par défaut posé plus haut, que le profil vienne d'être créé ou
        // existait déjà (compte créé entre le paiement et l'acceptation).
        const { error: errClub } = await supabase.from('profiles').update({
          plan: 'club', abonnement_actif: true, stripe_customer_id: inv.stripe_customer_id || null,
        }).eq('id', userId)
        if (errClub) throw errClub
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
    // Garde-fou en base (deux acceptations simultanées passées entre les mailles).
    if (err?.code === 'DF001') return reponseLimiteEducateurs(Number(String(err.message).split(':')[1]))
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
