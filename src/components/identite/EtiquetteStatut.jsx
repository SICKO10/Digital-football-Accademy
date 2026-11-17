import { useColors } from '../../lib/theme'
import { styleEtiquette, couleurCraie } from '../../lib/identite'

// Étiquette de statut : petites capitales sur fond neutre, avec un marqueur carré
// à la couleur du statut. La couleur ne sert qu'au marqueur, jamais au texte : le
// sens est porté par le libellé.
export default function EtiquetteStatut({ couleur, children, style }) {
  const colors = useColors()
  return (
    <span style={{ ...styleEtiquette(colors), fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: colors.background.raised, border: `1px solid ${couleurCraie(colors)}`, borderRadius: '4px', padding: '2px 8px', whiteSpace: 'nowrap', ...style }}>
      <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '1px', background: couleur, flexShrink: 0 }} />
      {children}
    </span>
  )
}
