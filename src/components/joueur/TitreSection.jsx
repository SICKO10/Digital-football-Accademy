import { useColors } from '../../lib/theme'
import { spacing } from '../../tokens'

// Sur-titre de section ("eyebrow") de l'espace joueur : le style (11px, 700,
// majuscules, interlettrage 0,14em, Barlow Condensed) vit dans la classe
// .dj-eyebrow de src/lib/ecranJoueur.js. Unifie les titres de section de l'ancien accueil, qui
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
      className="dj-eyebrow"
      style={{
        margin: `0 0 ${spacing.lg}`,
        color: couleur || colors.text.faint,
        ...style,
      }}
    >
      {children}
    </p>
  )
}
