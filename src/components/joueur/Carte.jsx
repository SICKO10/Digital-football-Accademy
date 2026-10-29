import { useColors } from '../../lib/theme'
import { alpha, radius, spacing } from '../../tokens'

// Carte standard de l'espace joueur — mêmes fond, bordure, rayon et padding
// dans les deux variantes (fan affilié et joueur Pro), cf. BRIEF.md : ce qui
// change entre les deux, c'est le contenu, jamais le style.
//
// `accent` (une couleur de colors.accent.*) donne la SEULE variante accentuée
// prévue : bordure teintée + lueur douce. Elle est réservée à l'élément "à la
// une" de l'accueil. Deux cartes accentuées sur le même écran et plus rien ne
// ressort — c'est exactement le défaut de l'ancien dashboard Pro.
//
// `isMobile` est passé en prop (et non lu via useIsMobileOrTablet ici) pour la
// même raison que PrepPhysiqueJoueur : le dashboard l'a déjà, et ce hook pose
// deux écouteurs de redimensionnement par instance — une dizaine de cartes par
// écran en poserait une vingtaine pour rien.
export default function Carte({ accent, isMobile = false, onClick, style, children, ...rest }) {
  const colors = useColors()
  return (
    <div
      onClick={onClick}
      style={{
        background: colors.background.surface,
        border: `1px solid ${accent ? accent + alpha.light : colors.border.subtle}`,
        borderRadius: radius['3xl'],
        padding: isMobile ? spacing['2xl'] : spacing['3xl'],
        boxShadow: accent ? `0 8px 32px ${accent}${alpha.faint}` : 'none',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}
