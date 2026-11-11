import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Verrou des outils à la carte (bloc 15, cf. supabase_outils_verrou.sql) pour
// les fonctions scan-* : un éducateur ou un club au nouveau modèle
// (profiles.modele_outils) doit détenir au moins un des outils indiqués.
// Les autres comptes et les appels sans utilisateur ne changent pas.
// Réponse : null si l'appel peut continuer, sinon la réponse de refus.
export async function verifierOutil(req: Request, outils: string[], corsHeaders: Record<string, string>): Promise<Response | null> {
  const refus = (status: number, error: string) => new Response(JSON.stringify({ error }), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
  const jeton = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!jeton) return null
  try {
    const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    const { data: { user } } = await db.auth.getUser(jeton)
    if (!user) return null
    const { data: profil, error } = await db.from('profiles').select('plan, modele_outils').eq('id', user.id).maybeSingle()
    if (error) throw error
    if (!profil?.modele_outils || !['educateur', 'club'].includes(profil.plan)) return null
    for (const outil of outils) {
      const { data: a, error: e } = await db.rpc('a_outil', { p_compte: user.id, p_outil: outil })
      if (e) throw e
      if (a) return null
    }
    return refus(403, 'Cet outil n\'est pas inclus dans ton offre.')
  } catch (e) {
    console.error('verifierOutil', e)
    return refus(500, 'Vérification de l\'accès impossible pour le moment. Réessaie dans quelques minutes.')
  }
}
