import { useCoachTheme } from '../../pages/coach/useCoachTheme'

// Carte de stat — bordure supérieure colorée, valeur en JetBrains Mono
// (cf. maquette). `accent` est la couleur de la barre du haut (souvent
// c.accent / c.success / c.warn / c.danger) ; `color` peut surcharger la
// couleur du chiffre lui-même si besoin (sinon = texte normal).
export default function StatCard({ label, value, sub, accent, color, onClick, active = false }) {
  const { c, fonts } = useCoachTheme()
  const cliquable = typeof onClick === 'function'
  const barColor = accent || c.accent
  return (
    <div
      onClick={onClick}
      role={cliquable ? 'button' : undefined}
      tabIndex={cliquable ? 0 : undefined}
      style={{
        background: c.surface,
        border: `1px solid ${active ? barColor : c.border}`,
        borderRadius: '10px', padding: '16px 18px', position: 'relative', overflow: 'hidden',
        cursor: cliquable ? 'pointer' : 'default',
      }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: barColor }} />
      <p style={{ margin: '0 0 5px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.textMuted }}>{label}</p>
      <p style={{ margin: '0 0 3px', fontFamily: fonts.mono, fontSize: '26px', fontWeight: 500, color: color || c.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: '12px', color: c.textMuted }}>{sub}</p>}
    </div>
  )
}
