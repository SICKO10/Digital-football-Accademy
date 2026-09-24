import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'

// Pill "Vidéo vérifiée" — table dédiée joueur_video_badges (cf.
// supabase_veo_import.sql), séparée de joueur_badges (Phase F, badges de
// tournoi) car attribuée par l'éducateur et non par le joueur. Même style de
// pill que BadgesJoueur.jsx pour rester visuellement cohérent à côté.
export default function BadgeVideoVerifiee({ joueurId }) {
  const colors = useColors()
  const [badge, setBadge] = useState(null)

  useEffect(() => {
    if (!joueurId) return
    supabase.from('joueur_video_badges').select('saison').eq('joueur_id', joueurId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setBadge(data))
  }, [joueurId])

  if (!badge) return null

  const couleur = colors.accent.blue
  return (
    <div title={`Saison ${badge.saison}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: couleur + '1f', border: `1px solid ${couleur}`, color: couleur, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
      <span>Vidéo vérifiée</span>
    </div>
  )
}
