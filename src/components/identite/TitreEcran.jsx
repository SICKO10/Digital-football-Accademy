import { useColors } from '../../lib/theme'
import { styleTitreEcran, styleLigneCraie } from '../../lib/identite'
import { police } from '../../tokens'
import Etiquette from './Etiquette'

// En-tête d'écran : sur-titre en étiquette (club, saison), titre condensé en
// capitales, sous-ligne de contexte, actions à droite, puis une ligne de craie.
export default function TitreEcran({ titre, sousTitre, surTitre, actions, as: Balise = 'h1', style }) {
  const colors = useColors()
  return (
    <header style={{ marginBottom: '20px', ...style }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px 16px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          {surTitre && <Etiquette as="p" style={{ marginBottom: '6px' }}>{surTitre}</Etiquette>}
          <Balise style={styleTitreEcran(colors)}>{titre}</Balise>
          {sousTitre && (
            <p style={{ fontFamily: police.texte, fontSize: '14px', lineHeight: 1.45, color: colors.text.secondary, margin: '6px 0 0' }}>{sousTitre}</p>
          )}
        </div>
        {actions && <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>{actions}</div>}
      </div>
      <div aria-hidden="true" style={{ ...styleLigneCraie(colors), marginTop: '14px' }} />
    </header>
  )
}
