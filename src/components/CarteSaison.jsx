import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { saisonActuelle } from '../lib/saison'

const COULEURS_TYPE = {
  champion: '#f59e0b',
  tournoi_victoire: '#4ade80',
  tournoi_participation: '#6366f1',
  meilleur_joueur: '#f59e0b',
  meilleur_buteur: '#ef4444',
  meilleur_gardien: '#3b82f6',
  fair_play: '#10b981',
  coupe: '#8b5cf6',
}

export default function CarteSaison({ userId }) {
  const colors = useColors()
  const [badges, setBadges] = useState([])
  const [saisonActive, setSaisonActive] = useState(saisonActuelle())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    supabase.from('joueur_badges').select('*')
      .eq('joueur_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setBadges(data || [])
        if (data?.length > 0 && !data.some(b => b.saison === saisonActuelle())) setSaisonActive(data[0].saison)
        setLoading(false)
      })
  }, [userId])

  if (loading) return null

  const saisons = [...new Set(badges.map(b => b.saison))].sort().reverse()
  const badgesSaison = badges.filter(b => b.saison === saisonActive)

  const st = {
    saisonBtn: (actif) => ({ background: actif ? colors.accent.green : 'transparent', color: actif ? colors.black : colors.text.faint, border: `1px solid ${actif ? colors.accent.green : colors.border.default}`, borderRadius: '20px', padding: '6px 16px', cursor: 'pointer', fontWeight: actif ? 700 : 500, fontSize: '13px' }),
    carte: (couleur) => ({
      background: `linear-gradient(135deg, ${couleur}22 0%, ${colors.background.surface} 60%)`,
      border: `1px solid ${couleur}44`,
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '12px',
      position: 'relative',
      overflow: 'hidden',
    }),
    glow: (couleur) => ({
      position: 'absolute', top: '-20px', right: '-20px',
      width: '80px', height: '80px', borderRadius: '50%',
      background: couleur + '33', filter: 'blur(20px)',
    }),
  }

  if (badges.length === 0) return (
    <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.faint}`, borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
      <h3 style={{ color: colors.text.faint, fontWeight: 600, margin: '0 0 6px' }}>Aucun badge pour l'instant</h3>
      <p style={{ color: colors.text.disabled, fontSize: '14px', margin: 0 }}>Participe à des tournois pour obtenir tes premières distinctions.</p>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <p style={{ color: colors.text.faint, margin: '0 0 14px', fontSize: '13px' }}>{badges.length} badge{badges.length > 1 ? 's' : ''} obtenu{badges.length > 1 ? 's' : ''}</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {saisons.map(s => (
            <button key={s} style={st.saisonBtn(saisonActive === s)} onClick={() => setSaisonActive(s)}>
              Saison {s}
            </button>
          ))}
        </div>
      </div>

      {badgesSaison.map(badge => {
        const couleur = COULEURS_TYPE[badge.type] || badge.couleur || colors.accent.green
        return (
          <div key={badge.id} style={st.carte(couleur)}>
            <div style={st.glow(couleur)} />
            <div style={{ fontSize: '32px', flexShrink: 0, zIndex: 1 }}>{badge.icone}</div>
            <div style={{ flex: 1, zIndex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '15px', marginBottom: '4px', color: colors.text.primary }}>{badge.label}</div>
              {badge.sous_label && <div style={{ color: colors.text.faint, fontSize: '13px' }}>{badge.sous_label}</div>}
              {badge.categorie && <div style={{ color: colors.text.disabled, fontSize: '12px', marginTop: '4px' }}>{badge.categorie}</div>}
            </div>
            <div style={{ textAlign: 'right', zIndex: 1, flexShrink: 0 }}>
              <div style={{ color: couleur, fontWeight: 800, fontSize: '11px', letterSpacing: '1px' }}>{badge.saison}</div>
              {badge.competition && <div style={{ color: colors.text.ghost, fontSize: '10px', marginTop: '2px', maxWidth: '110px' }}>{badge.competition}</div>}
            </div>
          </div>
        )
      })}

      {badgesSaison.length === 0 && (
        <div style={{ color: colors.text.disabled, textAlign: 'center', padding: '32px', fontSize: '14px' }}>
          Aucun badge pour la saison {saisonActive}
        </div>
      )}
    </div>
  )
}
