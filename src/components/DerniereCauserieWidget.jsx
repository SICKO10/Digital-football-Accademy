import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'

// Aperçu de la causerie préparée pour le prochain match — remplace le
// raccourci générique "Tacticboard" sur l'Accueil éducateur (cf.
// AccueilEducateur dans DashboardEducateur.jsx) : juste avant un match,
// voir directement ce qui a été préparé (ou être invité à le faire) est
// plus utile qu'un raccourci vers un tacticboard vide. Pas de colonne
// causeries.match_id (cf. supabase_causeries.sql, saisie manuelle
// adversaire/date_match) — on retrouve la causerie du prochain match par
// correspondance adversaire + date_match, seul lien disponible.
export default function DerniereCauserieWidget({ userId, prochainMatch, onOuvrir, accentColor = '#4ade80' }) {
  const colors = useColors()
  const [causerie, setCauserie] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !prochainMatch) { setLoading(false); return }
    const charger = async () => {
      const { data } = await supabase.from('causeries')
        .select('objectifs, cles_du_match')
        .eq('educateur_id', userId)
        .eq('adversaire', prochainMatch.adversaire)
        .eq('date_match', prochainMatch.date)
        .maybeSingle()
      setCauserie(data || null)
      setLoading(false)
    }
    charger()
  }, [userId, prochainMatch?.adversaire, prochainMatch?.date])

  if (!prochainMatch || loading) return null

  const clesRenseignees = (causerie?.cles_du_match || []).filter(Boolean)

  return (
    <button onClick={onOuvrir}
      style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', padding: '12px 14px', cursor: 'pointer', textAlign: 'left', color: colors.text.primary, fontFamily: 'Inter, sans-serif' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = accentColor}
      onMouseLeave={e => e.currentTarget.style.borderColor = colors.border.subtle}>
      <div style={{ fontSize: '10px', color: colors.text.dim, marginBottom: '4px', fontWeight: 700, letterSpacing: '0.5px' }}>PROCHAINE CAUSERIE</div>
      <div style={{ fontSize: '13px', color: colors.text.primary, fontWeight: 700, marginBottom: '6px', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        🎙️ vs {prochainMatch.adversaire || 'adversaire'}
      </div>
      {causerie ? (
        causerie.objectifs ? (
          <div style={{ fontSize: '11px', color: colors.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{causerie.objectifs}</div>
        ) : clesRenseignees.length > 0 ? (
          <div style={{ fontSize: '11px', color: colors.text.faint }}>{clesRenseignees.length} clé{clesRenseignees.length > 1 ? 's' : ''} du match préparée{clesRenseignees.length > 1 ? 's' : ''}</div>
        ) : (
          <div style={{ fontSize: '11px', color: accentColor, fontWeight: 600 }}>✓ Préparée</div>
        )
      ) : (
        <div style={{ fontSize: '11px', color: colors.text.faint }}>Pas encore préparée — clique pour la créer</div>
      )}
    </button>
  )
}
