import { useColors } from '../../lib/theme'
import { styleEtiquette } from '../../lib/identite'

// Étiquette de rubrique en petites capitales espacées (« EFFECTIF », « DERNIERS RÉSULTATS »).
export default function Etiquette({ children, as: Balise = 'span', style }) {
  const colors = useColors()
  return <Balise style={{ ...styleEtiquette(colors), margin: 0, ...style }}>{children}</Balise>
}
