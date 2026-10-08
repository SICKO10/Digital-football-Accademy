import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { colors } from '../tokens'
import { t } from '../lib/translationsHome'
import terrainsDesktop from '../assets/demos/terrains-desktop.webp'
import terrainsMobile from '../assets/demos/terrains-mobile.webp'
import deplacementsDesktop from '../assets/demos/deplacements-desktop.webp'
import deplacementsMobile from '../assets/demos/deplacements-mobile.webp'
import tactipadDesktop from '../assets/demos/tactipad-desktop.webp'
import tactipadMobile from '../assets/demos/tactipad-mobile.webp'
import disponibilitesDesktop from '../assets/demos/disponibilites-desktop.webp'
import disponibilitesMobile from '../assets/demos/disponibilites-mobile.webp'
import evaluationDesktop from '../assets/demos/evaluation-desktop.webp'
import evaluationMobile from '../assets/demos/evaluation-mobile.webp'
import carteJoueur from '../assets/demos/carte-joueur.webp'

// Section « Une semaine de match. Une seule plateforme. » — 5 scènes, chacune
// une capture des VRAIS composants React (PlanningTerrains, Deplacements,
// Tactipad, SondageSemaine, FicheEvaluationJoueur/CarteJoueur) rendus avec des
// données fictives, hors dashboards (aucune donnée réelle). Recadrages
// distincts desktop/mobile plutôt qu'une capture longue réduite en miniature.
// Scène 4 = sondage de présence uniquement (pas le module de convocation).
// Scène 5 : la carte joueur n'est qu'un visuel secondaire — aucun texte ne
// promet qu'elle est accessible à tous les profils.
const SCENES = [
  { profil: 'club', color: colors.accent.purpleLight,
    desktop: { src: terrainsDesktop, w: 1600, h: 1204 }, mobile: { src: terrainsMobile, w: 720, h: 901 } },
  { profil: 'club', color: colors.accent.purpleLight,
    desktop: { src: deplacementsDesktop, w: 1600, h: 943 }, mobile: { src: deplacementsMobile, w: 720, h: 901 } },
  { profil: 'educateur', color: colors.accent.blue,
    desktop: { src: tactipadDesktop, w: 1600, h: 952 }, mobile: { src: tactipadMobile, w: 720, h: 990 } },
  { profil: 'educateur', color: colors.accent.blue,
    desktop: { src: disponibilitesDesktop, w: 1600, h: 932 }, mobile: { src: disponibilitesMobile, w: 720, h: 901 } },
  { profil: 'joueur', color: colors.accent.green,
    desktop: { src: evaluationDesktop, w: 1556, h: 1196 }, mobile: { src: evaluationMobile, w: 720, h: 901 },
    secondaire: { src: carteJoueur, w: 480, h: 752 } },
]
const NB = SCENES.length
const num = i => String(i + 1).padStart(2, '0')

// Même approche que HDP_STYLE (HeroDashboardsPreview) : hover/focus/responsive
// impossibles en style inline. Couleur de scène passée en --dsm (hex) et
// --dsm-soft/--dsm-line (hex+alpha) — pas de color-mix(), absent de
// Safari < 16.2. ≤1024px : onglets horizontaux au-dessus de l'aperçu ;
// césure automatique des titres d'onglets (lang sur la section — ex.
// « Verfügbarkeiten » en allemand à 680px) ; ≤640px : carrousel natif (scroll-snap), display:none sur l'autre bloc pour
// qu'il sorte de l'arbre d'accessibilité et que ses images lazy ne se
// chargent pas.
const DSM_STYLE = `
  .dsm-desktop { display: grid; grid-template-columns: minmax(260px, 320px) minmax(0, 1fr); gap: 2rem; align-items: start; }
  .dsm-mobile { display: none; }
  .dsm-tabs { display: flex; flex-direction: column; gap: 8px; }
  .dsm-tab { display: flex; align-items: flex-start; gap: 14px; width: 100%; text-align: left; cursor: pointer;
    background: transparent; border: 1px solid ${colors.border.subtle}; border-left: 3px solid transparent; border-radius: 12px;
    padding: 14px 16px; color: ${colors.text.secondary}; font-family: Inter, sans-serif;
    transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease; }
  .dsm-tab[aria-selected="true"] { background: var(--dsm-soft); border-color: var(--dsm-line); border-left-color: var(--dsm); color: ${colors.text.primary}; }
  .dsm-tab:focus-visible, .dsm-ctrl:focus-visible, .dsm-dot:focus-visible, .dsm-track:focus-visible, .dsm-cta:focus-visible {
    outline: 2px solid ${colors.accent.green}; outline-offset: 3px; }
  .dsm-stage { position: relative; aspect-ratio: 16 / 10; border-radius: 18px; overflow: hidden;
    background: ${colors.background.base};
    border: 1px solid var(--dsm-line); box-shadow: 0 30px 60px -30px var(--dsm-glow); transition: border-color 0.3s ease, box-shadow 0.3s ease; }
  .dsm-layer { position: absolute; inset: 14px; opacity: 0; transform: scale(0.985); transition: opacity 0.35s ease, transform 0.35s ease; pointer-events: none; }
  .dsm-layer.is-active { opacity: 1; transform: none; }
  .dsm-layer img { display: block; }
  .dsm-track { display: flex; gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; padding: 4px 7% 8px;
    scrollbar-width: none; -webkit-overflow-scrolling: touch; scroll-behavior: smooth; }
  .dsm-track::-webkit-scrollbar { display: none; }
  .dsm-slide { flex: 0 0 86%; scroll-snap-align: center; }
  .dsm-dot { width: 8px; height: 8px; padding: 0; border-radius: 4px; border: none; cursor: pointer; background: ${colors.border.strong};
    transition: width 0.2s ease, background 0.2s ease; }
  .dsm-dot[data-actif="true"] { width: 22px; background: var(--dsm); }
  .dsm-dot-hit { padding: 10px 4px; background: none; border: none; cursor: pointer; display: inline-flex; }
  @media (hover: hover) and (pointer: fine) {
    .dsm-tab:not([aria-selected="true"]):hover { background: ${colors.background.surface}; border-color: ${colors.border.default}; color: ${colors.text.primary}; }
    .dsm-cta:hover { background: ${colors.accent.green}1f !important; }
  }
  @media (max-width: 1024px) {
    .dsm-desktop { grid-template-columns: minmax(0, 1fr); gap: 1.25rem; }
    .dsm-tabs { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
    .dsm-tab { border-left-width: 1px; border-top: 3px solid transparent; padding: 10px 12px; }
    .dsm-tab-titre { font-size: 13px !important; -webkit-hyphens: auto; hyphens: auto; }
    .dsm-tab[aria-selected="true"] { border-top-color: var(--dsm); }
  }
  @media (max-width: 640px) {
    .dsm-desktop { display: none; }
    .dsm-mobile { display: block; margin: 0 -1rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .dsm-tab, .dsm-stage, .dsm-layer, .dsm-dot { transition: none !important; }
    .dsm-layer { transform: none !important; }
    .dsm-track { scroll-behavior: auto; }
  }
`

const varsCouleur = c => ({ '--dsm': c, '--dsm-soft': c + '14', '--dsm-line': c + '45', '--dsm-glow': c + '40' })

function LabelScene({ scene, i, lang, taille = 11 }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: `${taille}px`, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: scene.color }}>
      <span aria-hidden="true" style={{ color: colors.text.faint, letterSpacing: 0 }}>{num(i)}</span>
      {t(`hero_preview_nav_${scene.profil}`, lang)}
    </span>
  )
}

export default function DemoSemaineMatch({ lang }) {
  const navigate = useNavigate()
  const [actif, setActif] = useState(0)
  const [actifMobile, setActifMobile] = useState(0)
  const tabsRef = useRef([])
  const trackRef = useRef(null)
  const slidesRef = useRef([])

  // Activation automatique (le visuel suit le focus clavier) : flèches dans
  // les deux axes car l'orientation change à ≤1024px, Début/Fin en bonus.
  const onTabsKeyDown = (e) => {
    const cible = { ArrowDown: actif + 1, ArrowRight: actif + 1, ArrowUp: actif - 1, ArrowLeft: actif - 1, Home: 0, End: NB - 1 }[e.key]
    if (cible === undefined) return
    e.preventDefault()
    const i = (cible + NB) % NB
    setActif(i)
    tabsRef.current[i]?.focus()
  }

  const allerA = (i) => {
    const track = trackRef.current
    const slide = slidesRef.current[i]
    if (!track || !slide) return
    track.scrollTo({ left: slide.offsetLeft - (track.clientWidth - slide.clientWidth) / 2 })
  }

  // Scène mobile visible = slide dont le centre est le plus proche du centre
  // du carrousel — se met à jour pendant le swipe comme après un clic.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const centre = track.scrollLeft + track.clientWidth / 2
        let meilleur = 0, distMin = Infinity
        slidesRef.current.forEach((s, i) => {
          const d = Math.abs(s.offsetLeft + s.clientWidth / 2 - centre)
          if (d < distMin) { distMin = d; meilleur = i }
        })
        setActifMobile(meilleur)
      })
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => { track.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [])

  const onTrackKeyDown = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    allerA(Math.min(NB - 1, Math.max(0, actifMobile + (e.key === 'ArrowRight' ? 1 : -1))))
  }

  const sceneActive = SCENES[actif]
  const sceneMobile = SCENES[actifMobile]
  const btnCtrl = (desactive) => ({
    width: '40px', height: '40px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: colors.background.surface, border: `1px solid ${colors.border.default}`, color: desactive ? colors.text.disabled : colors.text.primary,
    cursor: desactive ? 'default' : 'pointer', padding: 0,
  })

  return (
    <section aria-labelledby="dsm-titre" lang={lang} style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }} className="dsm-section">
      <style>{DSM_STYLE + '@media (max-width: 640px) { .dsm-section { padding-left: 1rem !important; padding-right: 1rem !important; } }'}</style>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-block', background: colors.background.surface, border: `1px solid ${colors.border.default}`, color: colors.text.secondary, fontSize: '11px', padding: '4px 14px', borderRadius: '20px', marginBottom: '1rem', letterSpacing: '1px', fontWeight: 600, textTransform: 'uppercase' }}>
          {t('action_badge', lang)}
        </div>
        <h2 id="dsm-titre" style={{ fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 0.75rem' }}>{t('action_titre', lang)}</h2>
        <p style={{ color: colors.text.dim, fontSize: '15px', lineHeight: 1.6, maxWidth: '560px', margin: '0 auto' }}>{t('action_soustitre', lang)}</p>
      </div>

      {/* ── Desktop / tablette : onglets + aperçu ── */}
      <div className="dsm-desktop" style={varsCouleur(sceneActive.color)}>
        <div role="tablist" aria-label={t('action_nav', lang)} aria-orientation="vertical" className="dsm-tabs" onKeyDown={onTabsKeyDown}>
          {SCENES.map((s, i) => (
            <button key={i} type="button" role="tab" id={`dsm-tab-${i}`} aria-selected={actif === i} aria-controls="dsm-panel"
              tabIndex={actif === i ? 0 : -1} ref={el => (tabsRef.current[i] = el)} onClick={() => setActif(i)}
              className="dsm-tab" style={varsCouleur(s.color)}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <LabelScene scene={s} i={i} lang={lang} />
                <span className="dsm-tab-titre" style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.3 }}>{t(`action_titre_${i + 1}`, lang)}</span>
              </span>
            </button>
          ))}
        </div>

        <div role="tabpanel" id="dsm-panel" aria-labelledby={`dsm-tab-${actif}`}>
          <div className="dsm-stage">
            {SCENES.map((s, i) => (
              <div key={i} className={`dsm-layer${actif === i ? ' is-active' : ''}`} aria-hidden={actif !== i}>
                {/* Fiche (93 % de haut ≈ 76 % de large) + carte (58 % ≈ 23 %) côte à
                    côte, centrées verticalement, ~1 % d'écart : aucun chevauchement,
                    la carte ne masque aucun contenu de la fiche. */}
                {s.secondaire ? (
                  <>
                    <img src={s.desktop.src} alt={t(`action_alt_${i + 1}`, lang)} width={s.desktop.w} height={s.desktop.h} loading="lazy" decoding="async"
                      style={{ position: 'absolute', left: 0, top: '3.5%', height: '93%', width: 'auto' }} />
                    <img src={s.secondaire.src} alt={t('action_alt_carte', lang)} width={s.secondaire.w} height={s.secondaire.h} loading="lazy" decoding="async"
                      style={{ position: 'absolute', right: 0, top: '21%', height: '58%', width: 'auto', filter: 'drop-shadow(0 18px 30px rgba(0,0,0,0.6))' }} />
                  </>
                ) : (
                  <img src={s.desktop.src} alt={t(`action_alt_${i + 1}`, lang)} width={s.desktop.w} height={s.desktop.h} loading="lazy" decoding="async"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                )}
              </div>
            ))}
          </div>
          <p style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '1rem 0 0', fontSize: '15px', color: colors.text.secondary, lineHeight: 1.5 }}>
            <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '50%', background: sceneActive.color, flexShrink: 0 }} />
            {t(`action_legende_${actif + 1}`, lang)}
          </p>
        </div>
      </div>

      {/* ── Mobile : carrousel horizontal ── */}
      <div className="dsm-mobile" style={varsCouleur(sceneMobile.color)}>
        <div ref={trackRef} className="dsm-track" role="region" aria-label={t('action_carrousel', lang)} tabIndex={0} onKeyDown={onTrackKeyDown}>
          {SCENES.map((s, i) => (
            <div key={i} ref={el => (slidesRef.current[i] = el)} className="dsm-slide" role="group"
              aria-label={`${i + 1} ${t('action_sur', lang)} ${NB} — ${t(`action_titre_${i + 1}`, lang)}`}>
              <div style={{ background: colors.background.surface, border: `1px solid ${s.color}45`, borderRadius: '16px', padding: '14px', height: '100%', boxSizing: 'border-box' }}>
                <LabelScene scene={s} i={i} lang={lang} />
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '6px 0 12px', lineHeight: 1.3 }}>{t(`action_titre_${i + 1}`, lang)}</h3>
                <div style={{ aspectRatio: '4 / 5', borderRadius: '10px', overflow: 'hidden', background: colors.background.base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={s.mobile.src} alt={t(`action_alt_${i + 1}`, lang)} width={s.mobile.w} height={s.mobile.h} loading="lazy" decoding="async"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <p style={{ fontSize: '14px', color: colors.text.secondary, lineHeight: 1.5, margin: '12px 0 0' }}>{t(`action_legende_${i + 1}`, lang)}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginTop: '14px' }}>
          <button type="button" className="dsm-ctrl" aria-label={t('action_prec', lang)} disabled={actifMobile === 0}
            onClick={() => allerA(actifMobile - 1)} style={btnCtrl(actifMobile === 0)}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {SCENES.map((s, i) => (
              <button key={i} type="button" className="dsm-dot-hit" aria-label={`${t('action_aller', lang)} ${i + 1} ${t('action_sur', lang)} ${NB}`}
                aria-current={actifMobile === i} onClick={() => allerA(i)}>
                <span className="dsm-dot" data-actif={actifMobile === i} />
              </button>
            ))}
          </div>
          <button type="button" className="dsm-ctrl" aria-label={t('action_suiv', lang)} disabled={actifMobile === NB - 1}
            onClick={() => allerA(actifMobile + 1)} style={btnCtrl(actifMobile === NB - 1)}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
        <button type="button" className="dsm-cta" onClick={() => navigate('/offres')}
          style={{ background: 'transparent', color: colors.accent.green, border: `1px solid ${colors.accent.green}40`, padding: '13px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background 0.2s ease' }}>
          {t('action_cta', lang)}
        </button>
        <p style={{ fontSize: '12px', color: colors.text.faint, margin: '1rem 0 0' }}>{t('action_mention', lang)}</p>
      </div>
    </section>
  )
}
