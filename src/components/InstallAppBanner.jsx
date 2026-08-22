import { useEffect, useState } from 'react'
import { colors } from '../tokens'
import { detecterPlateforme, estDejaInstallee, banniereDoitEtreMasquee, masquerBanniere } from '../lib/pwaInstall'

const IcoShare = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7" />
    <path d="M16 6l-4-4-4 4" />
    <path d="M12 2v13" />
  </svg>
)

const IcoDots = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
)

const IcoHomePlus = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11l9-7 9 7" />
    <path d="M5 10v9a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1v-9" />
    <circle cx="18" cy="6" r="4" fill={colors.background.base} stroke={colors.accent.green} />
    <path d="M18 4.5v3M16.5 6h3" stroke={colors.accent.green} />
  </svg>
)

const IcoCheck = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <path d="M8 12l3 3 6-6" />
  </svg>
)

const IcoPhone = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="2" width="12" height="20" rx="2" />
    <line x1="11" y1="18" x2="13" y2="18" />
  </svg>
)

const ETAPES = {
  ios: [
    { Icon: IcoShare, texte: 'Appuie sur le bouton Partager, dans la barre de Safari' },
    { Icon: IcoHomePlus, texte: 'Fais défiler et choisis « Sur l’écran d’accueil »' },
    { Icon: IcoCheck, texte: 'Appuie sur « Ajouter » en haut à droite' },
  ],
  android: [
    { Icon: IcoDots, texte: 'Appuie sur les trois points, en haut à droite de Chrome' },
    { Icon: IcoHomePlus, texte: 'Choisis « Ajouter à l’écran d’accueil »' },
    { Icon: IcoCheck, texte: 'Confirme en appuyant sur « Ajouter »' },
  ],
}

export default function InstallAppBanner() {
  const [plateforme, setPlateforme] = useState(null)
  const [visible, setVisible] = useState(false)
  const [tutoOuvert, setTutoOuvert] = useState(false)

  useEffect(() => {
    const p = detecterPlateforme()
    if (p === 'desktop') return
    if (estDejaInstallee()) return
    if (banniereDoitEtreMasquee()) return
    setPlateforme(p)
    // Petit délai pour ne pas apparaître pendant le tout premier rendu de la page.
    const id = setTimeout(() => setVisible(true), 1500)
    return () => clearTimeout(id)
  }, [])

  const fermer = () => {
    masquerBanniere()
    setVisible(false)
    setTutoOuvert(false)
  }

  if (!visible || !plateforme) return null

  return (
    <>
      <div
        style={{
          position: 'fixed', left: '12px', right: '12px', bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          zIndex: 2000, background: colors.background.surface, border: `1px solid ${colors.border.default}`,
          borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)', fontFamily: 'Inter, sans-serif',
        }}
      >
        <span style={{ color: colors.accent.green, flexShrink: 0, display: 'flex' }}><IcoPhone /></span>
        <p style={{ margin: 0, flex: 1, color: colors.text.secondary, fontSize: '13px', lineHeight: 1.4 }}>
          Ajoute Digital Football à ton écran d'accueil pour ne rater aucune actu.
        </p>
        <button onClick={() => setTutoOuvert(true)}
          style={{ background: colors.accent.green, color: colors.black, border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'Inter, sans-serif' }}>
          Comment faire ?
        </button>
        <button onClick={fermer} aria-label="Fermer"
          style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '18px', cursor: 'pointer', flexShrink: 0, padding: '0 2px' }}>
          ✕
        </button>
      </div>

      {tutoOuvert && (
        <div onClick={fermer}
          style={{ position: 'fixed', inset: 0, background: colors.background.overlay, zIndex: 2001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: colors.background.surface, border: `1px solid ${colors.border.default}`, borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '400px', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: colors.text.primary, margin: 0, fontSize: '16px' }}>
                Ajouter à l'écran d'accueil
              </h3>
              <button onClick={fermer} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: '20px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {ETAPES[plateforme].map((etape, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{
                    color: colors.accent.green, background: colors.accent.green + '18', border: `1px solid ${colors.accent.green}40`,
                    borderRadius: '50%', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <etape.Icon />
                  </span>
                  <p style={{ margin: 0, color: colors.text.secondary, fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ color: colors.text.faint, fontWeight: 700 }}>{i + 1}. </span>{etape.texte}
                  </p>
                </div>
              ))}
            </div>

            <button onClick={fermer}
              style={{ marginTop: '24px', width: '100%', background: colors.accent.green, color: colors.black, border: 'none', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
              Compris
            </button>
          </div>
        </div>
      )}
    </>
  )
}
