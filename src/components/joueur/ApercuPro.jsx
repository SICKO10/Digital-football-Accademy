import { useColors } from '../../lib/theme'
import { alpha, fontSize, radius, spacing } from '../../tokens'
import Carte from './Carte'
import TitreSection from './TitreSection'

// Aperçu de l'offre Pro — montre ce qui s'ouvre, au lieu de bloquer l'écran.
// Remplace les pages entières UpgradeCard, qui annonçaient au joueur qu'il
// n'avait pas le droit d'être là sans jamais lui donner envie.
//
// Volontairement une carte ordinaire et non accentuée : la seule carte
// accentuée de l'écran reste « à la une ». Un seul bouton, et c'est le parent
// qui décide ce qu'il fait (lien Stripe existant ou changement d'onglet) :
// rien de ce composant ne touche au paiement.
export default function ApercuPro({ surTitre = 'Offre Pro', titre, accroche, points = [], formules = [], libelleBouton, onCliquer, isMobile = false, style }) {
  const colors = useColors()
  return (
    <Carte isMobile={isMobile} style={style}>
      <TitreSection couleur={colors.accent.green}>{surTitre}</TitreSection>

      <p style={{ margin: 0, fontSize: isMobile ? fontSize['3xl'] : fontSize['4xl'], fontWeight: 800, letterSpacing: '-0.3px', color: colors.text.primary }}>
        {titre}
      </p>

      {accroche && (
        <p style={{ margin: `${spacing.md} 0 0`, fontSize: fontSize.lg, color: colors.text.secondary, lineHeight: 1.5 }}>
          {accroche}
        </p>
      )}

      {points.length > 0 && (
        <ul style={{ margin: `${spacing['2xl']} 0 0`, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {points.map((pt, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.lg, fontSize: fontSize.lg, color: colors.text.secondary }}>
              <span
                style={{
                  flexShrink: 0, marginTop: '5px', width: '6px', height: '6px', borderRadius: '999px',
                  background: colors.accent.green,
                }}
              />
              {pt}
            </li>
          ))}
        </ul>
      )}

      {/* Deux formules possibles : chacune annonce son prix ET ce qu'elle donne
          vraiment, pour que le joueur comprenne la différence sans avoir à
          chercher ailleurs. `misEnAvant` n'en distingue qu'une seule. */}
      {formules.length > 0 && (
        <div style={{ marginTop: spacing['3xl'], display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {formules.map((f, i) => (
            <div
              key={i}
              style={{
                border: `1px solid ${f.misEnAvant ? colors.accent.green + alpha.light : colors.border.subtle}`,
                background: f.misEnAvant ? colors.accent.green + alpha.faint : colors.background.raised,
                borderRadius: radius.xl,
                padding: spacing['2xl'],
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing.md, flexWrap: 'wrap' }}>
                <span style={{ fontSize: fontSize['6xl'], fontWeight: 800, letterSpacing: '-0.5px', color: f.misEnAvant ? colors.accent.green : colors.text.primary }}>
                  {f.prix}
                </span>
                {f.mention && (
                  <span style={{ fontSize: fontSize.base, fontWeight: 700, color: colors.accent.green }}>{f.mention}</span>
                )}
              </div>
              {f.detail && (
                <p style={{ margin: `${spacing.md} 0 0`, fontSize: fontSize.md, color: colors.text.faint, lineHeight: 1.5 }}>{f.detail}</p>
              )}
              <button
                onClick={f.onCliquer}
                style={{
                  marginTop: spacing['2xl'], width: '100%',
                  background: f.misEnAvant ? colors.accent.green : 'transparent',
                  color: f.misEnAvant ? colors.black : colors.accent.green,
                  border: f.misEnAvant ? 'none' : `1px solid ${colors.accent.green + alpha.light}`,
                  padding: `${spacing.lg} ${spacing['2xl']}`, borderRadius: radius.xl,
                  fontSize: fontSize.xl, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >
                {f.libelleBouton}
              </button>
            </div>
          ))}
        </div>
      )}

      {formules.length === 0 && libelleBouton && onCliquer && (
        <button
          onClick={onCliquer}
          style={{
            marginTop: spacing['3xl'], width: isMobile ? '100%' : 'auto',
            background: colors.accent.green, color: colors.black, border: 'none',
            padding: `${spacing.lg} ${spacing['4xl']}`, borderRadius: radius.xl,
            fontSize: fontSize.xl, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}
        >
          {libelleBouton}
        </button>
      )}
    </Carte>
  )
}
