import { useColors } from '../../lib/theme'
import { forme, spacing, fontSize } from '../../tokens'

// Grand bandeau de titre des rubriques de l'espace joueur : une petite ligne
// d'accroche, un titre en majuscules (police sportive condensée) dont le dernier
// mot prend la couleur du club, un sous-titre et un fond dégradé léger.
// `accentMot` : le mot du titre mis en couleur (facultatif).
export default function EnTetePage({ kicker, titre, accentMot, sousTitre, isMobile = false, droite, style }) {
  const colors = useColors()
  const couleur = colors.accent.green
  const parties = accentMot && titre.endsWith(accentMot) ? [titre.slice(0, titre.length - accentMot.length), accentMot] : [titre, null]

  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: forme.rayonCarte, padding: isMobile ? '24px 18px' : '36px 32px',
      background: colors.background.surface,
      border: `1px solid ${colors.border.subtle}`, borderLeft: `${forme.lisere} solid ${couleur}`, ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing['2xl'], flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          {kicker && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ width: '36px', height: '4px', borderRadius: forme.rayonPastille, background: couleur }} />
              <span style={{ fontSize: fontSize.lg, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: couleur }}>{kicker}</span>
            </div>
          )}
          <h1 style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Barlow', sans-serif", fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', lineHeight: 0.95, fontSize: isMobile ? '48px' : '72px', color: colors.text.primary, overflowWrap: 'anywhere' }}>
            {parties[0]}{parties[1] && <span style={{ color: couleur }}>{parties[1]}</span>}
          </h1>
          {sousTitre && (
            <p style={{ margin: `${spacing.xl} 0 0`, maxWidth: '620px', fontSize: fontSize['3xl'], color: colors.text.faint, lineHeight: 1.5 }}>{sousTitre}</p>
          )}
        </div>
        {droite}
      </div>
    </div>
  )
}
