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
  // Téléphone tenu en portrait : l'animation ne se lit qu'en paysage, le terrain
  // y serait trop petit. Message pour tourner le téléphone ; dès la rotation,
  // le schéma s'affiche et l'animation démarre.
  const portrait = taille.h > taille.l
  // Paysage : le terrain prend toute la hauteur ; la barre Fermer et les
  // commandes de lecture flottent par-dessus au lieu de lui voler de la place.
  // 44 px réservés sous le terrain pour le bouton Lire/Pause et l'étape.
  const largeur = Math.max(200, Math.floor(Math.min(taille.l - 16, (taille.h - 52) / ratioH)))

  const boutonFermer = (
    <button onClick={onFermer} style={{ flexShrink: 0, background: colors.background.raised, color: colors.text.primary, border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, padding: '8px 16px', fontWeight: 700, fontSize: fontSize.lg, cursor: 'pointer', fontFamily: 'inherit' }}>
      Fermer
    </button>
  )

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 5000, background: colors.background.base, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {portrait ? (
        <>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg, padding: '0 16px', boxSizing: 'border-box' }}>
            <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: fontSize.xl, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nom || 'Sans titre'}</span>
            {boutonFermer}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.lg, padding: '0 32px', textAlign: 'center', color: colors.text.primary }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="7" y="2" width="10" height="17" rx="2" />
              <path d="M21 14a8 8 0 0 1-8 8" /><polyline points="15 20 13 22 15 24" />
            </svg>
            <p style={{ margin: 0, fontWeight: 700, fontSize: fontSize.xl }}>Tourne ton téléphone</p>
            <p style={{ margin: 0, color: colors.text.faint, fontSize: fontSize.lg }}>L'animation se lit en mode paysage, pour voir tout le terrain.</p>
          </div>
        </>
      ) : (
        <>
          <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 1 }}>{boutonFermer}</div>
          <TactipadViewer schema={schema} width={largeur} lectureAuto={lectureAuto} />
        </>
      )}
    </div>,
    document.body
  )
}
