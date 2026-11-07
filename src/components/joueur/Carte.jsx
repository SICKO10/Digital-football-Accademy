import { useColors, useTheme } from '../../lib/theme'
import { alpha, radius, spacing } from '../../tokens'

// Carte standard de l'espace joueur — mêmes fond, bordure, rayon et padding
// dans les deux variantes (fan affilié et joueur Pro), cf. BRIEF.md : ce qui
// change entre les deux, c'est le contenu, jamais le style.
//
// `niveau` règle la profondeur de la carte (cf. BRIEF-joueur-v2.md, point 1) :
//   - "discret"  : fond transparent + bordure subtile, pour les blocs qui reculent
//                  (listes, groupes, blocs secondaires) ;
//   - "standard" : fond surface + bordure subtile, le défaut, inchangé ;
//   - "relief"   : fond surfaceAlt + bordure verte + lumière de terrain (lueur en
//                  thème sombre, ombre portée douce en thème clair). UN SEUL par
//                  écran, réservé au bloc "à la une" : deux et plus rien ne ressort.
//
// `accent` (une couleur de colors.accent.*) est l'ancienne variante accentuée.
// Il est remplacé par niveau="relief" : il ne reste que pour les appels existants
// (SanteJoueur, EquipementJoueur, NutritionIntro) et sera retiré quand ils auront
// migré. Ne pas l'utiliser dans du nouveau code.
//
// `isMobile` est passé en prop (et non lu via useIsMobileOrTablet ici) pour la
// même raison que PrepPhysiqueJoueur : le dashboard l'a déjà, et ce hook pose
// deux écouteurs de redimensionnement par instance — une dizaine de cartes par
// écran en poserait une vingtaine pour rien.
export default function Carte({ niveau = 'standard', accent, isMobile = false, onClick, style, children, ...rest }) {
  const colors = useColors()
  const { theme } = useTheme()
  const vert = colors.accent.green

  let fond = colors.background.surface
  let bordure = colors.border.subtle
  let ombre = 'none'
  if (niveau === 'discret') {
    fond = 'transparent'
  } else if (niveau === 'relief') {
    fond = colors.background.surfaceAlt
    bordure = vert + alpha.light
    ombre = theme === 'claire' ? '0 10px 30px -18px rgba(0,0,0,0.18)' : `0 24px 60px -34px ${vert}61`
  }
  if (niveau !== 'relief' && accent) {
    bordure = accent + alpha.light
    ombre = `0 8px 32px ${accent}${alpha.faint}`
  }

  return (
    <div
      onClick={onClick}
      style={{
        background: niveau === 'relief' && theme !== 'claire' ? `radial-gradient(circle at 15% 0%, ${vert}10, transparent 60%), ${fond}` : fond,
        border: `1px solid ${bordure}`,
        borderRadius: radius['3xl'],
        padding: isMobile ? spacing['2xl'] : spacing['3xl'],
        boxShadow: ombre,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}
