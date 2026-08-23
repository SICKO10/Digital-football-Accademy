import { useCoachTheme } from '../../pages/coach/useCoachTheme'

// Tabs "pilule" repris de la maquette : conteneur teinté surface-2, tab
// actif = fond surface + légère ombre.
export default function Tabs({ tabs, active, onChange }) {
  const { c } = useCoachTheme()
  return (
    <div style={{ display: 'inline-flex', gap: '3px', background: c.surface2, borderRadius: '8px', padding: '3px', marginBottom: '14px' }}>
      {tabs.map(t => {
        const isActive = t.id === active
        return (
          <button key={t.id} onClick={() => onChange(t.id)}
            style={{
              padding: '5px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
              border: 'none', background: isActive ? c.surface : 'none',
              color: isActive ? c.text : c.textMuted,
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
              fontFamily: 'Inter, sans-serif',
            }}>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
