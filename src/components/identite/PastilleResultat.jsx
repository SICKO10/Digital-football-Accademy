import { useColors } from '../../lib/theme'
import { couleursPastille } from '../../lib/identite'
import { police, forme } from '../../tokens'

// Pastille de classement V / N / D : carré à coins 4 px, lettre condensée.
// Le sens n'est pas porté par la seule couleur : lettre + nom accessible.
export default function PastilleResultat({ resultat, taille = 22, style }) {
  const colors = useColors()
  const p = couleursPastille(colors, resultat)
  if (!p) return null
  return (
    <span role="img" aria-label={p.libelle} title={p.libelle}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        width: `${taille}px`, height: `${taille}px`, borderRadius: forme.rayonPastille,
        background: p.fond, color: p.texte,
        fontFamily: police.titre, fontWeight: 700, fontSize: `${Math.round(taille * 0.64)}px`, lineHeight: 1,
        ...style,
      }}>
      {resultat}
    </span>
  )
}
