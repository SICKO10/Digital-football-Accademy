import { useColors } from '../../lib/theme'
import { fontSize, spacing } from '../../tokens'
import Carte from './Carte'
import TitreSection from './TitreSection'

// Carte dont le contenu se replie : pour ce qu'on remplit une fois par saison
// ou qu'on règle une fois (parcours, notifications). Le contenu est démonté
// quand c'est replié ; l'état des formulaires vit chez le parent, donc rien
// n'est perdu en repliant.
//
// `ouvert` et `onToggle` viennent du parent : une action (modifier un club du
// parcours) doit pouvoir ouvrir la section de l'extérieur.
export default function SectionRepliable({ titre, resume, ouvert, onToggle, isMobile = false, style, children }) {
  const colors = useColors()
  return (
    <Carte isMobile={isMobile} style={style}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={ouvert}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg,
          width: '100%', background: 'transparent', border: 'none', padding: 0,
          color: colors.text.primary, cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif',
        }}
      >
        <span>
          <TitreSection style={{ margin: 0 }}>{titre}</TitreSection>
          {resume && <span style={{ display: 'block', marginTop: spacing.xs, fontSize: fontSize.md, color: colors.text.faint }}>{resume}</span>}
        </span>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.text.faint}
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          style={{ flexShrink: 0, transform: ouvert ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {ouvert && <div style={{ marginTop: spacing['2xl'] }}>{children}</div>}
    </Carte>
  )
}
