import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

// Commun aux pages publiques du module Stages (page du stage, inscription).

export const CSS_STAGE_PUBLIC = `
  .sp-page { max-width: 760px; margin: 0 auto; padding: 32px 20px 64px; }
  .sp-titre { font-size: 34px; }
  @media (max-width: 640px) {
    .sp-page { padding: 20px 16px 48px; }
    .sp-titre { font-size: 26px; }
  }
`

// Stats sponsors (cf. supabase_stats_sponsors_phase1.sql) : une vue à
// l'ouverture de la page, un clic par sponsor cliqué. Fire-and-forget —
// n'importe quel visiteur (connecté ou non) peut déclencher ces deux RPC,
// jamais bloquant pour la page elle-même si elles échouent (migration pas
// encore exécutée, ou réseau).
export function loguerVueStage(lien) {
  supabase.rpc('loguer_vue_stage', { p_lien: lien }).then(() => {})
}
export function loguerClicSponsorStage(lien, sponsorId) {
  supabase.rpc('loguer_clic_sponsor_stage', { p_lien: lien, p_sponsor_id: sponsorId }).then(() => {})
}

export function useStagePublic(lien) {
  const [stage, setStage] = useState(null)
  const [etat, setEtat] = useState('chargement') // 'chargement' | 'ok' | 'introuvable' | 'erreur'
  useEffect(() => {
    let annule = false
    supabase.rpc('stage_public', { p_lien: lien }).then(({ data, error }) => {
      if (annule) return
      if (error) { setEtat('erreur'); return }
      if (!data) { setEtat('introuvable'); return }
      setStage(data)
      setEtat('ok')
    })
    return () => { annule = true }
  }, [lien])
  return { stage, etat }
}
