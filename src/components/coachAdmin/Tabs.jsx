import { colors } from '../../tokens'

// Tabs "pill" — pattern repris de src/pages/ClubPublic.jsx (tab actif = fond vert plein).
export default function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '6px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
      {tabs.map(t => {
        const isActive = t.id === active
        return (
          <button key={t.id} onClick={() => onChange(t.id)}
            style={{
              padding: '8px 18px', background: isActive ? colors.accent.green : 'transparent',
              color: isActive ? colors.black : colors.text.dim,
              border: isActive ? 'none' : '1px solid #2a2a2a',
              borderRadius: '20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}>
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
