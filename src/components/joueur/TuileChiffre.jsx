import { useColors } from '../../lib/theme'
import { alpha, fontSize, radius, spacing } from '../../tokens'

// Tuile d'un seul chiffre + sa légende (présence, analyses restantes,
// demandes...). Le chiffre est en 28px/800, la légende en 11px : la hiérarchie
// est dans la taille, pas dans la couleur, pour que plusieurs tuiles côte à
// côte restent lisibles sans se faire concurrence.
//
// `couleur` ne décore pas : elle suit le code de statut du projet (vert =
// fait/présent, bleu = information, orange = santé, rouge = absent/défaite,
// ambre = changement). Sans couleur, le chiffre reste en text.primary.
export default function TuileChiffre({ valeur, libelle, couleur, isMobile = false, onClick, style }) {
  const colors = useColors()
  return (
    <div
      onClick={onClick}
      style={{
        background: couleur ? couleur + alpha.faint : colors.background.raised,
        border: `1px solid ${couleur ? couleur + alpha.subtle : colors.border.subtle}`,
        borderRadius: radius.xl,
        padding: isMobile ? spacing.lg : spacing['2xl'],
        cursor: onClick ? 'pointer' : undefined,
        minWidth: 0,
        ...style,
      }}
    >
      <div
        style={{
          fontSize: fontSize['8xl'],
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: '-0.5px',
          color: couleur || colors.text.primary,
        }}
      >
        {valeur}
      </div>
      <div
        style={{
          marginTop: spacing.md,
          fontSize: fontSize.base,
          fontWeight: 600,
          color: colors.text.faint,
        }}
      >
        {libelle}
      </div>
    </div>
  )
}
