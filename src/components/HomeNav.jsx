import { useEffect, useRef, useState } from 'react'
import { colors, alpha } from '../tokens'
import { t, LANGS } from '../lib/translationsHome'

// Navigation de la Home, extraite de Home.jsx. Au-dessus de 1100px : liens +
// langues + Connexion/Commencer sur une ligne (inchangé). En dessous (tablette
// et mobile) : Connexion/Commencer restent visibles, liens et langues passent
// dans un menu déroulant — avant ce menu, la ligne complète débordait entre
// 769 et ~1000px (« Commencer » hors écran, masqué par overflowX:hidden) et
// sous 768px liens + langues disparaissaient sans alternative.
// Menu : se ferme sur Échap (focus rendu au bouton), clic extérieur, choix
// d'un lien, ou passage au-dessus de 1100px. Le changement de langue le
// laisse ouvert pour que le résultat soit visible tout de suite.
const BREAKPOINT = 1100

const HN_STYLE = `
  /* Nav sticky (~72px) : les ancres natives (#comment) s'arrêtent sous la
     nav plutôt que derrière. Style monté avec la Home uniquement. */
  html { scroll-padding-top: 88px; }
  .hn-burger, .hn-panel { display: none; }
  .hn-link:focus-visible, .hn-lang:focus-visible, .hn-burger:focus-visible, .hn-cta:focus-visible {
    outline: 2px solid ${colors.accent.green}; outline-offset: 2px; }
  @media (hover: hover) and (pointer: fine) {
    .hn-link:hover { color: ${colors.text.primary} !important; }
    .hn-panel .hn-link:hover { background: ${colors.background.surface}; }
  }
  @media (max-width: ${BREAKPOINT}px) {
    .hn-links { display: none !important; }
    .hn-burger { display: inline-flex; }
    .hn-panel[data-open="true"] { display: block; }
  }
  @media (max-width: 400px) {
    .navbar-home { padding-left: 1rem !important; padding-right: 1rem !important; gap: 8px; }
    .navbar-logo { font-size: 15px !important; }
    .hn-cta { padding: 7px 10px !important; font-size: 12.5px !important; }
    .hn-actions { gap: 6px !important; }
  }
`

export default function HomeNav({ lang, setLang, navigate }) {
  const [ouvert, setOuvert] = useState(false)
  const navRef = useRef(null)
  const burgerRef = useRef(null)
  const premierLienRef = useRef(null)

  useEffect(() => {
    if (!ouvert) return
    premierLienRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') { setOuvert(false); burgerRef.current?.focus() } }
    const onClicExterieur = (e) => { if (navRef.current && !navRef.current.contains(e.target)) setOuvert(false) }
    const mq = window.matchMedia(`(min-width: ${BREAKPOINT + 1}px)`)
    const onLarge = (e) => { if (e.matches) setOuvert(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClicExterieur)
    mq.addEventListener('change', onLarge)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClicExterieur)
      mq.removeEventListener('change', onLarge)
    }
  }, [ouvert])

  // Vrais liens (href) pour le clavier, le clic molette et les lecteurs
  // d'écran ; navigation SPA conservée via navigate().
  const LIENS = [
    { href: '#comment', label: t('home_comment_marche', lang) },
    { href: '/offres', label: t('home_offres', lang) },
    { href: '/comment-financer', label: t('home_financement', lang) },
    { href: '/jogabonito', label: 'Jogabonito' },
  ]
  const suivre = (href, apresMenu) => (e) => {
    if (apresMenu) setOuvert(false)
    if (href.startsWith('#')) return
    e.preventDefault()
    navigate(href)
  }

  const boutonsLangue = (compact) => LANGS.map(l => {
    const actif = lang === l.code
    return (
      <button key={l.code} type="button" className="hn-lang" onClick={() => setLang(l.code)}
        aria-label={l.label} aria-pressed={actif} title={l.label} lang={l.code}
        style={{
          background: actif ? colors.accent.green + alpha.soft : 'transparent', border: `1px solid ${actif ? colors.accent.green : colors.border.default}`,
          borderRadius: compact ? '6px' : '10px', padding: compact ? '3px 6px' : '10px 12px', cursor: 'pointer', fontSize: compact ? '12px' : '14px',
          fontFamily: 'Inter, sans-serif', color: actif ? colors.text.primary : colors.text.secondary,
          display: 'flex', alignItems: 'center', gap: '8px', justifyContent: compact ? 'center' : 'flex-start',
        }}>
        <span aria-hidden="true">{l.flag}</span>
        {!compact && <span>{l.label}</span>}
      </button>
    )
  })

  const cta = { padding: '8px 18px', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif' }

  return (
    <nav ref={navRef} aria-label={t('nav_principale', lang)} className="navbar-home"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(1rem + env(safe-area-inset-top, 0px)) 2rem 1rem', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)', zIndex: 100 }}>
      <style>{HN_STYLE}</style>
      <div className="navbar-logo" style={{ fontSize: '18px', fontWeight: 700, flexShrink: 0 }}>Digital<span style={{ color: colors.accent.green }}>Football</span></div>

      <div className="hn-links" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        {LIENS.map(l => (
          <a key={l.href} href={l.href} className="hn-link" onClick={suivre(l.href, false)}
            style={{ color: colors.text.dim, textDecoration: 'none', fontSize: '14px' }}>{l.label}</a>
        ))}
        <div role="group" aria-label={t('nav_langue', lang)} style={{ display: 'flex', gap: '4px' }}>{boutonsLangue(true)}</div>
      </div>

      <div className="hn-actions" style={{ display: 'flex', gap: '10px', flexShrink: 0, alignItems: 'center' }}>
        <button type="button" className="hn-cta" onClick={() => navigate('/login')}
          style={{ ...cta, background: 'transparent', color: colors.text.secondary, border: '1px solid #333' }}>{t('auth_connexion_titre', lang)}</button>
        <button type="button" className="hn-cta" onClick={() => navigate('/register')}
          style={{ ...cta, background: colors.accent.green, color: colors.black, border: 'none', fontWeight: 700 }}>{t('home_commencer', lang)}</button>
        <button ref={burgerRef} type="button" className="hn-burger" onClick={() => setOuvert(o => !o)}
          aria-expanded={ouvert} aria-controls="hn-menu" aria-label={t(ouvert ? 'nav_menu_fermer' : 'nav_menu_ouvrir', lang)}
          style={{ width: '38px', height: '38px', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: '8px', cursor: 'pointer', padding: 0,
            background: ouvert ? colors.background.surface : 'transparent', border: `1px solid ${colors.border.strong}`, color: colors.text.primary }}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {ouvert ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      <div id="hn-menu" className="hn-panel" data-open={ouvert}
        style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: colors.background.base, borderBottom: `1px solid ${colors.border.subtle}`,
          boxShadow: '0 24px 40px -12px rgba(0,0,0,0.7)', maxHeight: 'calc(100vh - 72px)', overflowY: 'auto' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0.75rem 1rem 1.25rem' }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {LIENS.map((l, i) => (
              <li key={l.href}>
                <a href={l.href} ref={i === 0 ? premierLienRef : undefined} className="hn-link" onClick={suivre(l.href, true)}
                  style={{ display: 'block', padding: '13px 12px', borderRadius: '10px', color: colors.text.secondary, textDecoration: 'none', fontSize: '16px', fontWeight: 600 }}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div role="group" aria-label={t('nav_langue', lang)} style={{ borderTop: `1px solid ${colors.border.subtle}`, marginTop: '0.75rem', paddingTop: '1rem' }}>
            <p aria-hidden="true" style={{ margin: '0 0 10px 12px', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: colors.text.faint }}>{t('nav_langue', lang)}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>{boutonsLangue(false)}</div>
          </div>
        </div>
      </div>
    </nav>
  )
}
