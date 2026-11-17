import { useColors } from '../../lib/theme'
import { fontSize, forme, spacing } from '../../tokens'
import Carte from './Carte'
import TitreSection from './TitreSection'

// « Tu as joué ? » : l'accès en un geste à la saisie d'un match joué (la saisie
// elle-même vit dans MesStats, ouverte par le parent). Une phrase + une action.
export default function BlocSaisirMatch({ onSaisir, isMobile = false, style }) {
  const colors = useColors()
  return (
    <Carte niveau="discret" isMobile={isMobile} style={style}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing['2xl'], flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <TitreSection style={{ margin: 0 }}>Match joué</TitreSection>
          <p style={{ margin: `${spacing.sm} 0 0`, fontSize: fontSize['3xl'], color: colors.text.secondary }}>
            Tu as joué ? Note tes minutes, tes buts et tes passes décisives.
          </p>
        </div>
        <button
          onClick={onSaisir}
          style={{
            minHeight: 44, padding: `0 ${spacing['4xl']}`, cursor: 'pointer', flexShrink: 0,
            background: colors.accent.green, color: colors.accent.onBrand, border: 'none',
            borderRadius: forme.rayonPastille, fontWeight: 700, fontSize: fontSize['3xl'], fontFamily: 'Barlow, sans-serif',
          }}
        >
          Saisir mon match
        </button>
      </div>
    </Carte>
  )
}
