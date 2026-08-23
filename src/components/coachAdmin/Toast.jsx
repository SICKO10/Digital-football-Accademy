import { useCoachTheme } from '../../pages/coach/useCoachTheme'

const VARIANT_ICON = { success: '✓', error: '✕', info: 'ℹ' }

// Pile de toasts en bas à droite, chaque toast se retire lui-même après son
// délai (géré par l'appelant via pushToast/setTimeout) — ce composant est
// purement présentationnel.
export default function ToastStack({ toasts }) {
  const { c, rgba } = useCoachTheme()
  if (toasts.length === 0) return null
  return (
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 2000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {toasts.map(t => {
        const color = t.variant === 'error' ? c.danger : t.variant === 'info' ? c.accent : c.success
        return (
          <div key={t.id} style={{
            background: c.surface, border: `1px solid ${rgba(color, 0.4)}`, borderRadius: '8px',
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)', minWidth: '220px', maxWidth: '360px',
            animation: 'coach-toast-in 0.15s ease',
          }}>
            <span style={{ color, fontWeight: 700 }}>{VARIANT_ICON[t.variant] || VARIANT_ICON.success}</span>
            <span style={{ color: c.text, fontSize: '13px' }}>{t.message}</span>
          </div>
        )
      })}
      <style>{`@keyframes coach-toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}
