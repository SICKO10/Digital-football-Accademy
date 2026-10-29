import { useColors } from '../../lib/theme'
import { fontSize, spacing } from '../../tokens'

// Sur-titre de section ("eyebrow") de l'espace joueur : 11px, 700, majuscules,
// interlettrage 1px. Unifie les titres de section de l'ancien accueil, qui
// étaient tantôt en 10px vert avec un interlettrage de 1,5px, tantôt en 11px
// gris à 800 — deux styles pour le même rôle, sur le même écran.
//
// `couleur` sert aux rares sections qui se distinguent volontairement (la
// section "à la une" par exemple) ; par défaut c'est text.faint, qui laisse le
// titre de carte au premier plan.
export default function TitreSection({ children, couleur, style }) {
  const colors = useColors()
  return (
    <p
      style={{
        margin: `0 0 ${spacing.lg}`,
        fontSize: fontSize.base,
        fontWeight: 700,
        color: couleur || colors.text.faint,
        textTransform: 'uppercase',
        letterSpacing: '1px',
        ...style,
      }}
    >
      {children}
    </p>
  )
}
