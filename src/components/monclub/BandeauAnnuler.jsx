import { useEffect } from 'react'
import { useColors } from '../../lib/theme'
import { Icone } from './ui'
import { ICONES, stylesMonClub } from './uiMonClub'

// Bandeau « Annuler » affiché quelques secondes après un changement de Mon
// club (réutilisé par l'étape Dashboard de mes éducateurs). `changement` :
// { id, message, annuler } ou null ; `onFin` est appelé à la fin du délai.
export default function BandeauAnnuler({ changement, onFin, duree = 8000 }) {
  const colors = useColors()
  const s = stylesMonClub(colors)
  const id = changement?.id
  useEffect(() => {
    if (!id) return undefined
    const t = setTimeout(onFin, duree)
    return () => clearTimeout(t)
  }, [id, onFin, duree])

  if (!changement) return null
  return (
    <div role="status" style={{
      position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 50, maxWidth: 560, margin: '0 auto', boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '12px 14px 12px 16px', borderRadius: 16,
      background: colors.background.surface, color: colors.text.primary, border: `1px solid ${colors.border.strong}`,
      boxShadow: '0 14px 40px rgba(0,0,0,0.28)', fontFamily: 'Inter, sans-serif', fontSize: 14, lineHeight: 1.4,
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        <span aria-hidden="true" style={{ width: 26, height: 26, borderRadius: 999, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: colors.accent.success, color: '#0a0a0a' }}><Icone d={ICONES.check} size={14} trait={3} /></span>
        {changement.message}
      </span>
      <button type="button" onClick={changement.annuler} className="mc-btn" style={{ ...s.bouton(false), minHeight: 36, padding: '6px 14px', flexShrink: 0 }}>
        <Icone d={ICONES.retablir} size={14} /> Annuler
      </button>
    </div>
  )
}
