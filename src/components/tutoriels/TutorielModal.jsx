import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useColors } from '../../lib/theme'

// Fenêtre de tutoriel pas à pas : une illustration (maquette de l'écran
// concerné), un titre, un texte et éventuellement une liste de points par
// étape. Navigation Précédent / Suivant, points cliquables, flèches clavier,
// Échap pour fermer.
export default function TutorielModal({ titre, etapes, accent, onFermer }) {
  const colors = useColors()
  const couleur = accent || colors.accent.blue
  const [idx, setIdx] = useState(0)
  const etape = etapes[idx]
  const derniere = idx === etapes.length - 1

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onFermer()
      else if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, etapes.length - 1))
      else if (e.key === 'ArrowLeft') setIdx(i => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [etapes.length, onFermer])

  return createPortal(
    <div onClick={onFermer} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: 'Inter, sans-serif' }}>
      <div role="dialog" aria-modal="true" aria-label={titre} onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '580px', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto', background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '18px', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '16px 20px', borderBottom: `1px solid ${colors.border.subtle}` }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: couleur }}>Tutoriel</p>
            <p style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 800, color: colors.text.primary }}>{titre}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <span style={{ fontSize: '12px', color: colors.text.faint, fontVariantNumeric: 'tabular-nums' }}>{idx + 1} / {etapes.length}</span>
            <button onClick={onFermer} aria-label="Fermer" style={{ width: '32px', height: '32px', borderRadius: '50%', border: `1px solid ${colors.border.default}`, background: 'transparent', color: colors.text.faint, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>

        <div style={{ padding: '18px 20px 6px' }}>
          <div style={{ background: colors.background.base, border: `1px solid ${colors.border.faint}`, borderRadius: '14px', padding: '18px', minHeight: '190px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {etape.visuel}
          </div>
          <p style={{ margin: '18px 0 6px', fontSize: '18px', fontWeight: 800, color: colors.text.primary }}>{etape.titre}</p>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: colors.text.secondary }}>{etape.texte}</p>
          {etape.points?.length > 0 && (
            <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {etape.points.map((pt, i) => (
                <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '13px', lineHeight: 1.5, color: colors.text.secondary }}>
                  <span style={{ flexShrink: 0, width: '20px', height: '20px', borderRadius: '50%', background: couleur + '22', color: couleur, fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '1px' }}>{i + 1}</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          )}
          {etape.astuce && (
            <p style={{ margin: '12px 0 0', padding: '10px 12px', borderRadius: '10px', background: couleur + '14', border: `1px solid ${couleur}33`, fontSize: '12px', lineHeight: 1.5, color: colors.text.secondary }}>
              <b style={{ color: couleur }}>Astuce · </b>{etape.astuce}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '16px 20px 20px' }}>
          <button onClick={() => setIdx(i => Math.max(i - 1, 0))} disabled={idx === 0}
            style={{ padding: '10px 16px', borderRadius: '10px', border: `1px solid ${colors.border.default}`, background: 'transparent', color: colors.text.secondary, fontWeight: 600, fontSize: '13px', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.35 : 1, fontFamily: 'inherit' }}>
            Précédent
          </button>
          <div style={{ display: 'flex', gap: '6px' }}>
            {etapes.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} aria-label={`Étape ${i + 1}`}
                style={{ width: i === idx ? '22px' : '8px', height: '8px', borderRadius: '4px', border: 'none', padding: 0, cursor: 'pointer', background: i === idx ? couleur : colors.border.default, transition: 'width 0.2s' }} />
            ))}
          </div>
          <button onClick={() => (derniere ? onFermer() : setIdx(i => i + 1))}
            style={{ padding: '10px 18px', borderRadius: '10px', border: 'none', background: couleur, color: colors.black, fontWeight: 800, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
            {derniere ? "C'est compris" : 'Suivant'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
