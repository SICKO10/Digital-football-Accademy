import { colors, alpha } from '../../tokens'

const VARIANTS = {
  active: colors.accent.green,
  success: colors.accent.green,
  inactive: colors.text.disabled,
  pending: colors.accent.orange,
  danger: colors.accent.red,
  info: colors.accent.blue,
  warn: colors.accent.amber,
}

// Badge de statut générique — remplace les <span> stylées à la main
// dupliquées dans chaque section de DashboardCoach.jsx.
export default function Pill({ variant = 'info', children }) {
  const color = VARIANTS[variant] || VARIANTS.info
  return (
    <span style={{
      display: 'inline-block', background: color + alpha.subtle, border: `1px solid ${color}40`,
      color, fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}
