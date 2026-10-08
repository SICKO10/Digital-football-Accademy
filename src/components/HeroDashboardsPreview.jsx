import { useState } from 'react'
import { colors, alpha } from '../tokens'
import { t } from '../lib/translationsHome'
import dashboardJoueur from '../assets/dashboards/dashboard-joueur.png'
import dashboardEducateur from '../assets/dashboards/dashboard-educateur.png'
import dashboardClub from '../assets/dashboards/dashboard-club.png'

// Dimensions réelles des 3 captures (identiques, cf. procédure de prise de
// vue) — fournies à <img> en plus du CSS pour que le navigateur réserve
// l'espace avant chargement (pas de décalage de mise en page, cf. consigne
// perf). Les 3 fichiers sont déjà recadrés (sans chrome navigateur ni
// bandeau pub) et anonymisés (nom/logo du club démo et visage du joueur
// floutés) avant d'arriver dans le projet.
const IMG_W = 1600
const IMG_H = 797

// Ordre circulaire (pas un ordre d'affichage fixe gauche/centre/droite,
// cf. getSlot) : quel que soit le profil actif, les deux autres se
// répartissent automatiquement à gauche/droite selon leur position dans ce
// cycle — ex. éducateur actif → joueur à gauche, club à droite (= la
// disposition par défaut) ; joueur actif → club à gauche, éducateur à
// droite. Donne un effet "carrousel" cohérent plutôt qu'un réarrangement
// arbitraire à chaque clic.
const PROFILS = [
  { id: 'joueur', navKey: 'hero_preview_nav_joueur', msgKey: 'hero_preview_msg_joueur', color: colors.accent.green, image: dashboardJoueur, alt: 'Aperçu du dashboard Joueur Digital Football' },
  { id: 'educateur', navKey: 'hero_preview_nav_educateur', msgKey: 'hero_preview_msg_educateur', color: colors.accent.blue, image: dashboardEducateur, alt: 'Aperçu du dashboard Éducateur Digital Football' },
  { id: 'club', navKey: 'hero_preview_nav_club', msgKey: 'hero_preview_msg_club', color: colors.accent.purpleLight, image: dashboardClub, alt: 'Aperçu du dashboard Club Digital Football' },
]
const ORDRE_CYCLE = PROFILS.map(p => p.id)
const getSlot = (id, activeId) => {
  if (id === activeId) return 'center'
  const i = ORDRE_CYCLE.indexOf(id)
  const a = ORDRE_CYCLE.indexOf(activeId)
  return (a + 1) % ORDRE_CYCLE.length === i ? 'right' : 'left'
}

// Desktop = composition en profondeur, panneau actif large au premier plan,
// les 2 autres réduits et partiellement superposés derrière (cf. getSlot
// pour quel profil va à gauche/droite). En dessous de 900px les 3 panneaux
// deviennent trop étroits pour rester lisibles (cf. consigne tablette) — on
// bascule alors sur la même présentation qu'en mobile, un seul dashboard +
// onglets. Hover exclu sur tactile (cf. consigne dédiée) ; prefers-reduced-
// motion coupe toutes les transitions/animations plutôt que de les
// réduire, plus simple et sans perte de fonctionnalité (le changement
// d'onglet reste instantané).
const HDP_STYLE = `
  @keyframes hdp-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  .hdp-stagger { opacity: 0; animation: hdp-fade-up 0.6s ease forwards; }
  .hdp-desktop { display: flex; }
  .hdp-mobile { display: none; }
  @media (max-width: 900px) {
    .hdp-desktop { display: none; }
    .hdp-mobile { display: flex; }
  }
  @media (hover: hover) and (pointer: fine) {
    .hdp-panel-side:hover { filter: brightness(1.25); opacity: 0.85 !important; }
    .hdp-tab:hover { opacity: 0.85; }
  }
  .hdp-tab:focus-visible, .hdp-panel-btn:focus-visible {
    outline: 2px solid ${colors.accent.green};
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    .hdp-stagger { opacity: 1; animation: none; }
    .hdp-panel, .hdp-tab, .hdp-panel-btn { transition: none !important; }
  }
`

// Panneau actif : grande vedette, nette et lumineuse — 750 à 950px visés sur
// grand écran (clamp borné par le viewport, pas juste par le conteneur, pour
// vraiment "remplir" l'espace comme demandé). Panneaux secondaires : ~40%
// de la largeur du panneau actif, superposés derrière lui (margin négative)
// via un slot gauche/droite, assombris mais jamais proches de l'invisible
// (opacity 0.7, pas 0.3) pour qu'on comprenne qu'il existe 3 univers.
const slotStyle = (slot, color) => {
  if (slot === 'center') {
    return {
      width: 'clamp(600px, 58vw, 950px)', maxWidth: '92vw',
      zIndex: 3, opacity: 1, filter: 'none', transform: 'translateY(0) scale(1)',
      border: `1.5px solid ${color}`, boxShadow: `0 32px 70px -18px ${color}66, 0 0 0 1px ${color}33`,
      marginLeft: 0, marginRight: 0,
    }
  }
  const decale = slot === 'left' ? '26px' : '-26px'
  return {
    width: 'clamp(260px, 25vw, 400px)',
    zIndex: 1, opacity: 0.7, filter: 'brightness(0.78) saturate(0.9)', transform: `translateY(${decale}) scale(0.94)`,
    border: `1px solid ${colors.border.subtle}`, boxShadow: '0 14px 32px -16px rgba(0,0,0,0.6)',
    marginLeft: slot === 'right' ? '-90px' : 0, marginRight: slot === 'left' ? '-90px' : 0,
  }
}

// Déclarés hors du composant (pas recréés à chaque rendu, cf.
// react-hooks/static-components) — état du profil actif reçu en props.
function Panels({ mobile, profilActif, setProfilActif, lang }) {
  const actif = PROFILS.find(p => p.id === profilActif)
  return (
    <>
      {(mobile ? [actif] : PROFILS).map(p => {
        const estActif = p.id === profilActif
        const slot = mobile ? 'center' : getSlot(p.id, profilActif)
        return (
          <button
            key={p.id}
            type="button"
            className={`hdp-panel-btn hdp-panel ${!estActif ? 'hdp-panel-side' : ''}`}
            onClick={() => setProfilActif(p.id)}
            aria-pressed={estActif}
            aria-label={t(p.navKey, lang)}
            style={mobile
              ? { width: '100%', background: colors.background.surface, border: `1px solid ${p.color}`, borderRadius: '14px', overflow: 'hidden', padding: 0, cursor: 'default', boxShadow: `0 20px 48px -18px ${p.color}55` }
              : {
                  ...slotStyle(slot, p.color),
                  position: 'relative', minWidth: 0, flexShrink: 0,
                  transition: 'width 0.34s cubic-bezier(0.22,1,0.36,1), margin 0.34s cubic-bezier(0.22,1,0.36,1), transform 0.34s cubic-bezier(0.22,1,0.36,1), opacity 0.34s ease, filter 0.34s ease, box-shadow 0.34s ease, border-color 0.34s ease',
                  background: colors.background.surface, borderRadius: '14px', overflow: 'hidden', padding: 0,
                  cursor: estActif ? 'default' : 'pointer',
                }
            }>
            <img
              src={p.image} alt={p.alt} width={IMG_W} height={IMG_H}
              loading={p.id === 'educateur' ? 'eager' : 'lazy'}
              {...(p.id === 'educateur' ? { fetchPriority: 'high' } : {})}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </button>
        )
      })}
    </>
  )
}

function NavTabs({ profilActif, setProfilActif, lang }) {
  return (
    <div role="tablist" aria-label="Choisir un profil" style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
      {PROFILS.map(p => {
        const estActif = p.id === profilActif
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={estActif}
            className="hdp-tab"
            onClick={() => setProfilActif(p.id)}
            style={{
              background: estActif ? p.color + alpha.subtle : 'transparent',
              border: `1px solid ${estActif ? p.color : colors.border.default}`,
              color: estActif ? p.color : colors.text.faint,
              borderRadius: '20px', padding: '8px 20px', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'color 0.2s, border-color 0.2s, background 0.2s',
              letterSpacing: '0.04em',
            }}>
            {t(p.navKey, lang)}
          </button>
        )
      })}
    </div>
  )
}

export default function HeroDashboardsPreview({ lang }) {
  const [profilActif, setProfilActif] = useState('educateur')
  const actif = PROFILS.find(p => p.id === profilActif)

  return (
    <div style={{ maxWidth: '1400px', margin: '3rem auto 0' }}>
      <style>{HDP_STYLE}</style>

      <div className="hdp-stagger" style={{ animationDelay: '0.45s' }}>
        <NavTabs profilActif={profilActif} setProfilActif={setProfilActif} lang={lang} />
      </div>

      {/* ── Desktop/tablette large : panneau actif en vedette, 2 autres
          superposés derrière (cf. slotStyle) — overflow visible car les
          panneaux secondaires débordent volontairement sous le panneau
          actif ; le root de Home.jsx a déjà overflowX:hidden, filet de
          sécurité si jamais ça dépasse sur un écran étroit. ── */}
      <div className="hdp-desktop" style={{ justifyContent: 'center', alignItems: 'center', padding: '20px 8px 0' }}>
        <Panels mobile={false} profilActif={profilActif} setProfilActif={setProfilActif} lang={lang} />
      </div>

      {/* ── Tablette étroite/mobile : un seul dashboard, piloté par les onglets ci-dessus ── */}
      <div className="hdp-mobile hdp-stagger" style={{ animationDelay: '0.55s' }}>
        <Panels mobile={true} profilActif={profilActif} setProfilActif={setProfilActif} lang={lang} />
      </div>

      <p className="hdp-stagger" style={{ animationDelay: '0.65s', textAlign: 'center', color: actif.color, fontSize: '15px', fontWeight: 700, marginTop: '28px', marginBottom: 0, transition: 'color 0.3s ease' }}>
        {t(actif.msgKey, lang)}
      </p>
    </div>
  )
}
