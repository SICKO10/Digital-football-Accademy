import { colors, alpha } from '../../tokens'

// Carte de stat cliquable (généralisation du StatCard local de DashboardClub.jsx :
// ajoute onClick/active pour servir de filtre rapide, ex. sur la page Utilisateurs).
export default function StatCard({ label, value, color = colors.text.primary, onClick, active = false }) {
  const cliquable = typeof onClick === 'function'
  return (
    <div
      onClick={onClick}
      role={cliquable ? 'button' : undefined}
      tabIndex={cliquable ? 0 : undefined}
      style={{
        background: active ? color + alpha.subtle : colors.background.surface,
        border: `1px solid ${active ? color + alpha.medium : '#222'}`,
        borderRadius: '12px', padding: '14px', textAlign: 'center',
        cursor: cliquable ? 'pointer' : 'default',
        transition: 'border-color 0.15s, background 0.15s',
      }}>
      <p style={{ margin: '0 0 4px', fontSize: '10px', color: colors.text.dim, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '20px', fontWeight: 800, color }}>{value}</p>
    </div>
  )
}
