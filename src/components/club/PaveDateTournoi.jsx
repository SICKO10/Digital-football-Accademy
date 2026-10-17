// Pavé date façon feuille de match, partagé par les deux listes de tournois.
export default function PaveDateTournoi({ iso, colors, couleur }) {
  const d = iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00`) : null
  return (
    <div style={{ width: '52px', textAlign: 'center', border: `1px solid ${colors.border.default}`, borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
      <p style={{ margin: 0, padding: '2px 0', fontSize: '9px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: couleur ? '#000' : colors.text.faint, background: couleur || colors.background.raised }}>{d ? d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '') : '—'}</p>
      <p style={{ margin: 0, padding: '5px 0 2px', fontSize: '20px', fontWeight: 800, lineHeight: 1, color: colors.text.primary }}>{d ? d.getDate() : '?'}</p>
      <p style={{ margin: 0, padding: '0 0 4px', fontSize: '9px', fontWeight: 700, color: colors.text.faint }}>{d ? d.getFullYear() : ''}</p>
    </div>
  )
}
