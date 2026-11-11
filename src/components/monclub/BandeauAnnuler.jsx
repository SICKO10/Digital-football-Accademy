import { useEffect } from 'react'
import { useColors } from '../../lib/theme'

// Bandeau « Annuler » affiché quelques secondes après un changement de Mon
// club (réutilisé par l'étape Dashboard de mes éducateurs). `changement` :
// { id, message, annuler } ou null ; `onFin` est appelé à la fin du délai.
export default function BandeauAnnuler({ changement, onFin, duree = 8000 }) {
  const colors = useColors()
  const id = changement?.id
  useEffect(() => {
    if (!id) return undefined
    const t = setTimeout(onFin, duree)
    return () => clearTimeout(t)
  }, [id, onFin, duree])

  if (!changement) return null
  return (
    <div role="status" style={{
      position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 50, maxWidth: 520, margin: '0 auto', boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderRadius: 12,
      background: colors.background.raised, color: colors.text.primary, border: `1px solid ${colors.border.strong}`,
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)', fontFamily: 'Inter, sans-serif', fontSize: 13, lineHeight: 1.4,
    }}>
      <span>{changement.message}</span>
      <button type="button" onClick={changement.annuler} style={{
        flexShrink: 0, background: 'transparent', border: `1px solid ${colors.border.strong}`, color: colors.text.primary,
        borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
      }}>
        Annuler
      </button>
    </div>
  )
}
