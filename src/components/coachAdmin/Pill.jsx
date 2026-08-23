import { useCoachTheme } from '../../pages/coach/useCoachTheme'

export default function Pill({ variant = 'blue', children }) {
  const { c, rgba } = useCoachTheme()
  const VARIANTS = {
    active: c.success,
    success: c.success,
    inactive: c.textMuted,
    pending: c.warn,
    danger: c.danger,
    blue: c.accent,
    info: c.accent,
  }
  const color = VARIANTS[variant] || VARIANTS.blue
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: rgba(color, variant === 'inactive' ? 0.15 : 0.12), color,
      fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor' }} />
      {children}
    </span>
  )
}
