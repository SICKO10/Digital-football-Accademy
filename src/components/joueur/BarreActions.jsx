import { useState } from 'react'
import { useColors } from '../../lib/theme'
import { alpha, fontSize, radius, spacing } from '../../tokens'

// Barre d'actions compacte de l'accueil joueur (Jogabonito, Feed, Publier),
// remplaçant les trois grandes tuiles jumelles. Chaque action est un bouton
// `.dj-cliquable` de rayon 12 px : icône teintée, titre, et sous-titre sur
// ordinateur seulement.
//
// `vignette` ({ type: 'image' | 'video', src }, cf. vignetteVideo dans
// src/lib/ecranJoueur.js) et `lienVideo` : la dernière vidéo publiée, ouverte
// dans un nouvel onglet au clic. Sans vignette, ou si l'image ne charge pas, la
// vignette disparaît et la barre reste seule.
//
// `actions` : [{ id, titre, sousTitre, icone, couleur, onClick, domId }].
export default function BarreActions({ actions, vignette, lienVideo, libelleVideo, isMobile = false, style }) {
  const colors = useColors()
  const [vignetteCassee, setVignetteCassee] = useState(false)
  const afficherVignette = !!vignette && !!lienVideo && !vignetteCassee

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'stretch', ...style }}>
      {afficherVignette && (
        <a
          href={lienVideo}
          target="_blank"
          rel="noreferrer"
          className="dj-cliquable"
          aria-label={libelleVideo}
          style={{
            position: 'relative', display: 'block', overflow: 'hidden', flex: isMobile ? '1 1 100%' : '0 0 176px',
            height: isMobile ? '132px' : 'auto', minHeight: '92px', borderRadius: radius.xl,
            border: `1px solid ${colors.border.subtle}`, background: colors.background.sunken,
          }}
        >
          {vignette.type === 'image' ? (
            <img src={vignette.src} alt="" onError={() => setVignetteCassee(true)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <video src={vignette.src} muted playsInline preload="metadata" onError={() => setVignetteCassee(true)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
          )}
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.45))' }}>
            <span style={{ width: '36px', height: '36px', borderRadius: radius.circle, background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ marginLeft: '2px' }}><path d="M6 4l14 8-14 8z" /></svg>
            </span>
          </span>
        </a>
      )}

      {actions.map(a => (
        <button
          key={a.id}
          id={a.domId}
          type="button"
          className="dj-cliquable"
          onClick={a.onClick}
          style={{
            flex: '1 1 0', minWidth: isMobile ? '0' : '150px', display: 'flex', alignItems: 'center', gap: spacing.lg,
            textAlign: 'left', cursor: 'pointer', padding: `${spacing.lg} ${spacing.xl}`, borderRadius: radius.xl,
            background: colors.background.surface, border: `1px solid ${colors.border.subtle}`,
            color: colors.text.primary, fontFamily: 'Inter, sans-serif',
          }}
        >
          <span style={{ width: '36px', height: '36px', borderRadius: radius.lg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: a.couleur + alpha.subtle, color: a.couleur }}>
            {a.icone}
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontWeight: 800, fontSize: fontSize.lg, letterSpacing: '-0.2px' }}>{a.titre}</span>
            {!isMobile && a.sousTitre && (
              <span style={{ display: 'block', marginTop: '2px', fontSize: fontSize.md, color: colors.text.faint, lineHeight: 1.4 }}>{a.sousTitre}</span>
            )}
          </span>
        </button>
      ))}
    </div>
  )
}
