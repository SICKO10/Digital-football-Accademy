import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { fontSize, radius, spacing } from '../tokens'
import TactipadViewer from './TactipadViewer'

// Schéma en plein écran, pour le téléphone et l'ordinateur : un calque qui couvre tout l'écran
// et dimensionne le terrain (ratio 16:10) sur l'écran en paysage. On tente
// aussi le vrai plein écran du navigateur et le verrouillage en paysage
// (Android/Chrome) ; là où ce n'est pas possible (iPhone), le joueur tourne
// simplement son téléphone — tant qu'il est en portrait, on le lui demande.
export default function SchemaPleinEcran({ schema, nom, colors, onFermer }) {
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
        await screen.orientation?.lock?.('landscape')
      } catch { /* navigateur sans plein écran ou verrouillage : le calque suffit */ }
    })()
    const bodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('resize', maj)
      window.removeEventListener('orientationchange', maj)
      document.removeEventListener('fullscreenchange', surChangementPleinEcran)
      document.body.style.overflow = bodyOverflow
      try { screen.orientation?.unlock?.() } catch { /* sans effet */ }
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const paysage = taille.l > taille.h
  // 56 px de barre du haut + 56 px pour le bouton de lecture sous le terrain.
  const largeur = Math.max(260, Math.floor(Math.min(taille.l - 24, (taille.h - 112) * 1.6)))

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 5000, background: colors.background.base, display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ width: '100%', height: '56px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg, padding: '0 16px', boxSizing: 'border-box' }}>
        <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: fontSize.xl, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nom || 'Sans titre'}</span>
        <button onClick={onFermer} style={{ flexShrink: 0, background: colors.background.raised, color: colors.text.primary, border: `1px solid ${colors.border.default}`, borderRadius: radius.lg, padding: '8px 16px', fontWeight: 700, fontSize: fontSize.lg, cursor: 'pointer', fontFamily: 'inherit' }}>
          Fermer
        </button>
      </div>
      {paysage ? (
        <TactipadViewer schema={schema} width={largeur} />
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: spacing.xl, padding: '0 32px', textAlign: 'center' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={colors.accent.green} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="7" y="2" width="10" height="20" rx="2" style={{ transformOrigin: '12px 12px', transform: 'rotate(-90deg)' }} />
            <path d="M20 8a9 9 0 0 0-4-4M20 4v4h-4" />
          </svg>
          <p style={{ margin: 0, color: colors.text.primary, fontWeight: 700, fontSize: fontSize['3xl'] }}>Tourne ton téléphone en paysage</p>
          <p style={{ margin: 0, color: colors.text.faint, fontSize: fontSize.lg, lineHeight: 1.5 }}>Le schéma s'affichera en grand, sur tout l'écran.</p>
        </div>
      )}
    </div>,
    document.body
  )
}
