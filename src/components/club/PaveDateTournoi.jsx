import { texteSur } from '../../lib/identite'
import { police } from '../../tokens'

// Pavé date façon feuille de match, partagé par les deux listes de tournois.
// Le mois prend la couleur de repère du statut ; la lettre dessus est choisie
// (blanc ou encre) pour rester lisible.
export default function PaveDateTournoi({ iso, colors, couleur }) {
  const d = iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00`) : null
  return (
    <div style={{ width: '52px', textAlign: 'center', border: `1px solid ${colors.border.default}`, borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
      <p style={{ margin: 0, padding: '2px 0', fontFamily: police.texte, fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: couleur ? texteSur(couleur) : colors.text.dim, background: couleur || colors.background.raised }}>{d ? d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '') : '—'}</p>
      <p style={{ margin: 0, padding: '5px 0 2px', fontFamily: police.titre, fontSize: '22px', fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: colors.text.primary }}>{d ? d.getDate() : '?'}</p>
      <p style={{ margin: 0, padding: '0 0 4px', fontSize: '10px', fontWeight: 600, color: colors.text.dim }}>{d ? d.getFullYear() : ''}</p>
    </div>
  )
}
