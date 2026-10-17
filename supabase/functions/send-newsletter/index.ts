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

    // cible ('tous' | 'educateurs' | 'joueurs') : destinataires calculés ici
    // (le navigateur ne peut plus lire l'email des autres comptes). L'ancienne
    // forme (liste destinataires fournie) reste acceptée, filtrée comme avant.
    const { annonce_id, club_id, titre, contenu, destinataires, cible } = await req.json()
    const CIBLES = ['tous', 'educateurs', 'joueurs']

    if (!club_id || !titre || !contenu || (!CIBLES.includes(cible) && !Array.isArray(destinataires))) {
      return new Response(
        JSON.stringify({ error: 'Champs manquants : club_id, titre, contenu, cible requis' }),
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

    // La liste destinataires vient du navigateur : on ne l'utilise que filtrée
    // sur les membres réels du club — éducateurs affiliés (club_educateurs
    // accepté) et joueurs affiliés à ces éducateurs. Une newsletter club ne
    // doit jamais partir vers d'autres éducateurs de la plateforme (l'envoi à
    // tous est réservé au coach admin, send-notification-plateforme).
    // Requêtes paginées : PostgREST tronque à 1000 lignes sans erreur.
    const toutesLignes = async (build: () => any) => {
      const lignes: any[] = []
      for (let debut = 0; ; debut += 1000) {
        const { data, error } = await build().range(debut, debut + 999)
        if (error) throw error
        lignes.push(...(data || []))
        if (!data || data.length < 1000) return lignes
      }
    }
    const educRows = await toutesLignes(() => supabase.from('club_educateurs').select('educateur_id').eq('club_id', club_id).eq('statut', 'accepte').order('educateur_id'))
    const educateurIds = [...new Set(educRows.map((r: any) => r.educateur_id).filter(Boolean))]
    const joueursIds = new Set<string>()
    for (let i = 0; i < educateurIds.length; i += 150) {
      const paquet = educateurIds.slice(i, i + 150)
      const affRows = await toutesLignes(() => supabase.from('affiliations').select('id, joueur_id').in('educateur_id', paquet).eq('statut', 'accepte').order('id'))
      affRows.forEach((r: any) => { if (r.joueur_id) joueursIds.add(r.joueur_id) })
    }
    const lireProfils = async (ids: string[]) => {
      const lignes: any[] = []
      for (let i = 0; i < ids.length; i += 150) {
        const paquet = ids.slice(i, i + 150)
        lignes.push(...await toutesLignes(() => supabase.from('profiles').select('id, email, prenom, nom').in('id', paquet).order('id')))
      }
      return lignes
    }

    let destinatairesValides: { email: string; nom?: string }[]
    let ignores = 0
    if (CIBLES.includes(cible)) {
      const ids = new Set<string>()
      if (cible !== 'joueurs') (educateurIds as string[]).forEach(id => ids.add(id))
      if (cible !== 'educateurs') joueursIds.forEach(id => ids.add(id))
      const vus = new Set<string>()
      destinatairesValides = []
      for (const p of await lireProfils([...ids])) {
        const cle = (p.email || '').toLowerCase()
        if (!cle || vus.has(cle)) continue
        vus.add(cle)
        destinatairesValides.push({ email: p.email, nom: `${p.prenom || ''} ${p.nom || ''}`.trim() })
      }
    } else {
      // Ancienne forme : liste fournie, filtrée sur les membres réels du club.
      const emailsAutorises = new Set<string>()
      for (const p of await lireProfils([...(educateurIds as string[]), ...joueursIds])) { if (p.email) emailsAutorises.add(p.email.toLowerCase()) }
      destinatairesValides = destinataires.filter((d: { email?: string }) => d?.email && emailsAutorises.has(d.email.toLowerCase()))
      ignores = destinataires.length - destinatairesValides.length
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
      destinatairesValides.map((dest: { email: string; nom?: string }) =>
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

    return new Response(JSON.stringify({ success: true, envoyes, erreurs, ignores }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
