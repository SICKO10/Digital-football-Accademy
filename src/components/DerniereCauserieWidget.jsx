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
const IcoMicro = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0014 0"/><line x1="12" y1="17" x2="12" y2="22"/></svg>

// variante 'raccourci' (optionnelle) : même donnée et même action, rendue
// comme un raccourci compact d'une ligne (rangée "Actions rapides" de
// l'accueil éducateur) — styleRaccourci fourni par le parent pour rester
// identique aux raccourcis voisins. Sans variante : rendu carte d'origine.
export default function DerniereCauserieWidget({ userId, prochainMatch, onOuvrir, accentColor = '#4ade80', variante = 'carte', styleRaccourci }) {
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

  if (variante === 'raccourci') return (
    <button onClick={onOuvrir} title={causerie?.objectifs || undefined} style={styleRaccourci}>
      <span style={{ display: 'inline-flex', color: accentColor, flexShrink: 0 }}><IcoMicro /></span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>Causerie vs {prochainMatch.adversaire || 'adversaire'}</span>
      <span style={{ flexShrink: 0, fontSize: '10px', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: causerie ? accentColor : colors.text.faint }}>
        {causerie ? 'Préparée' : 'À préparer'}
      </span>
    </button>
  )

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
