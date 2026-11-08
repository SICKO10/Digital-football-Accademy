import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { fontSize, radius, spacing } from '../tokens'
import TactipadViewer from './TactipadViewer'

// Schéma en plein écran, comme une vidéo, en portrait et en paysage : un calque
// qui couvre tout l'écran et dimensionne le terrain, avec le ratio réel du
// schéma, pour qu'il tienne en entier dans la place disponible. On tente aussi
// le vrai plein écran du navigateur ; là où ce n'est pas possible (iPhone),
// le calque fixe suffit. Pas de verrouillage d'orientation : le joueur choisit.
export default function SchemaPleinEcran({ schema, nom, colors, onFermer, lectureAuto = false }) {
  const [taille, setTaille] = useState({ l: window.innerWidth, h: window.innerHeight })

  useEffect(() => {
    const maj = () => setTaille({ l: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', maj)
    window.addEventListener('orientationchange', maj)
    const surChangementPleinEcran = () => { if (!document.fullscreenElement) onFermer() }
    let pleinEcranObtenu = false
    ;(async () => {
      try {
        await document.documentElement.requestFullscreen?.()
        pleinEcranObtenu = !!document.fullscreenElement
        if (pleinEcranObtenu) document.addEventListener('fullscreenchange', surChangementPleinEcran)
      } catch { /* navigateur sans plein écran : le calque suffit */ }
    })()
    const bodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('resize', maj)
      window.removeEventListener('orientationchange', maj)
      document.removeEventListener('fullscreenchange', surChangementPleinEcran)
      document.body.style.overflow = bodyOverflow
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ratioH = (schema?.terrain?.w && schema?.terrain?.h) ? schema.terrain.h / schema.terrain.w : 0.625
  // 56 px de barre du haut + 56 px pour le bouton de lecture sous le terrain.
  const largeur = Math.max(200, Math.floor(Math.min(taille.l - 16, (taille.h - 112) / ratioH)))

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 5000, background: colors.background.base, display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ width: '100%', height: '56px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg, padding: '0 16px', boxSizing: 'border-box' }}>
        <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: fontSize.xl, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nom || 'Sans titre'}</span>
        <button onClick={onFermer} style={{ flexShrink: 0, background: colors.background.raised, color: colors.text.primary, border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, padding: '8px 16px', fontWeight: 700, fontSize: fontSize.lg, cursor: 'pointer', fontFamily: 'inherit' }}>
          Fermer
        </button>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        <TactipadViewer schema={schema} width={largeur} lectureAuto={lectureAuto} />
      </div>
    </div>,
    document.body
  )
}
