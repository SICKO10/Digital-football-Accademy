import { useColors } from '../lib/theme'
import { texteSur } from '../lib/identite'

// Pastille numérotée d'un principe de jeu. Reliée à une zone, elle prend la
// couleur de la zone (la même pastille est dessinée sur le terrain) ; sans
// zone, elle reste neutre. `actif` = principe ou zone sélectionnés.
export default function PastillePlan({ numero, couleur = null, actif = false, taille = 24 }) {
  const colors = useColors()
  const fond = couleur || colors.background.raised
  const texte = couleur ? texteSur(couleur) : colors.text.primary
  return (
    <span aria-hidden="true" style={{
      width: taille, height: taille, borderRadius: '50%', flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: fond, color: texte, fontSize: Math.round(taille * 0.5), fontWeight: 800, lineHeight: 1,
      boxShadow: actif ? `0 0 0 2px ${colors.background.surface}, 0 0 0 4px ${couleur || colors.text.primary}` : `inset 0 0 0 1px ${couleur ? 'rgba(0,0,0,0.25)' : colors.border.default}`,
    }}>
      {numero}
    </span>
  )
}
