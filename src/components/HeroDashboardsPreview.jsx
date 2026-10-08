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

// Ordre circulaire (jamais un ordre d'affichage fixe gauche/centre/droite) :
// quel que soit le profil actif, les deux autres se répartissent
// automatiquement à gauche/droite selon leur position dans ce cycle — ex.
// éducateur actif → joueur à gauche, club à droite (= la disposition par
// défaut) ; joueur actif → club à gauche, éducateur à droite. Donne un
// effet "carrousel" cohérent plutôt qu'un réarrangement arbitraire.
const PROFILS = [
  { id: 'joueur', navKey: 'hero_preview_nav_joueur', msgKey: 'hero_preview_msg_joueur', color: colors.accent.green, image: dashboardJoueur, alt: 'Aperçu du dashboard Joueur Digital Football' },
  { id: 'educateur', navKey: 'hero_preview_nav_educateur', msgKey: 'hero_preview_msg_educateur', color: colors.accent.blue, image: dashboardEducateur, alt: 'Aperçu du dashboard Éducateur Digital Football' },
  { id: 'club', navKey: 'hero_preview_nav_club', msgKey: 'hero_preview_msg_club', color: colors.accent.purpleLight, image: dashboardClub, alt: 'Aperçu du dashboard Club Digital Football' },
]
const ORDRE_CYCLE = PROFILS.map(p => p.id)
const getRole = (id, activeId) => {
  if (id === activeId) return 'active'
  const i = ORDRE_CYCLE.indexOf(id)
  const a = ORDRE_CYCLE.indexOf(activeId)
  return (a + 1) % ORDRE_CYCLE.length === i ? 'right' : 'left'
}

// Décalage horizontal des panneaux secondaires depuis le centre de la scène
// — en clamp(vw) pour rester proportionné de 1280px à grand écran (cf.
// consigne desktop 1280/1440px+), jamais une valeur fixe qui déborderait ou
// paraîtrait écrasée selon la largeur réelle.
const DECALAGE_X = 'clamp(190px, 18vw, 330px)'
const LARGEUR_ACTIF = 'clamp(600px, 56vw, 950px)'
const LARGEUR_SECONDAIRE = 'clamp(230px, 21vw, 370px)'

// scene: conteneur de positionnement (position:relative), chaque panneau en
// position:absolute positionné selon son rôle (actif/gauche/droite) — pas
// selon son index dans le DOM, pour que le panneau actif soit TOUJOURS
// centré sous les onglets, quel que soit le profil cliqué (cf. bug
// précédent : une répartition flex en ordre DOM décalait visuellement le
// panneau actif dès qu'il n'était pas celui du milieu). En dessous de
// 900px les 3 panneaux deviennent trop étroits pour rester lisibles (cf.
// consigne tablette) — on bascule alors sur la même présentation qu'en
// mobile, un seul dashboard + onglets ; display:none (pas opacity/
// visibility) pour que les 3 panneaux desktop ne restent jamais
// accessibles au clavier quand ils sont masqués. Hover exclu sur tactile ;
// prefers-reduced-motion coupe toutes les transitions/animations plutôt
// que de les réduire, plus simple et sans perte de fonctionnalité (le
// changement d'onglet reste instantané).
const HDP_STYLE = `
  @keyframes hdp-fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  .hdp-stagger { opacity: 0; animation: hdp-fade-up 0.6s ease forwards; }
  .hdp-desktop { display: block; }
  .hdp-mobile { display: none; }
  @media (max-width: 900px) {
    .hdp-desktop { display: none; }
    .hdp-mobile { display: flex; }
  }
  @media (hover: hover) and (pointer: fine) {
    .hdp-panel-side:hover { filter: brightness(1.25) !important; opacity: 0.85 !important; }
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

// Transform = ancre centrale (left:50%; top:50%) + décalage par rôle. Les
// translate() restent en % de la boîte NON mise à l'échelle (scale() placé
// en dernier dans chaque chaîne), donc le centrage -50%/-50% est toujours
// exact quelle que soit la taille finale du panneau.
const ROLE_CONFIG = {
  active: { width: LARGEUR_ACTIF, translate: 'translate(-50%, -50%) scale(1)', zIndex: 3, opacity: 1, filter: 'none' },
  left: { width: LARGEUR_SECONDAIRE, translate: `translate(calc(-50% - ${DECALAGE_X}), calc(-50% + 22px)) scale(0.92)`, zIndex: 1, opacity: 0.68, filter: 'brightness(0.78) saturate(0.9)' },
  right: { width: LARGEUR_SECONDAIRE, translate: `translate(calc(-50% + ${DECALAGE_X}), calc(-50% + 22px)) scale(0.92)`, zIndex: 1, opacity: 0.68, filter: 'brightness(0.78) saturate(0.9)' },
}

const panelStyleDesktop = (role, color) => ({
  position: 'absolute', top: '50%', left: '50%', minWidth: 0,
  width: ROLE_CONFIG[role].width,
  transform: ROLE_CONFIG[role].translate,
  zIndex: ROLE_CONFIG[role].zIndex,
  opacity: ROLE_CONFIG[role].opacity,
  filter: ROLE_CONFIG[role].filter,
  transition: 'width 0.34s cubic-bezier(0.22,1,0.36,1), transform 0.34s cubic-bezier(0.22,1,0.36,1), opacity 0.34s ease, filter 0.34s ease, box-shadow 0.34s ease, border-color 0.34s ease',
  background: colors.background.surface,
  border: `${role === 'active' ? '1.5px' : '1px'} solid ${role === 'active' ? color : colors.border.subtle}`,
  borderRadius: '14px', overflow: 'hidden', padding: 0,
  boxShadow: role === 'active' ? `0 32px 70px -18px ${color}66, 0 0 0 1px ${color}33` : '0 14px 32px -16px rgba(0,0,0,0.6)',
  cursor: role === 'active' ? 'default' : 'pointer',
})

// Déclarés hors du composant (pas recréés à chaque rendu, cf.
// react-hooks/static-components) — état du profil actif reçu en props.
function Panels({ mobile, profilActif, setProfilActif, lang }) {
  const actif = PROFILS.find(p => p.id === profilActif)
  return (
    <>
      {(mobile ? [actif] : PROFILS).map(p => {
        const role = mobile ? 'active' : getRole(p.id, profilActif)
        const estActif = role === 'active'
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
              : panelStyleDesktop(role, p.color)
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

      {/* ── Desktop/tablette large : scène position:relative, les 3 panneaux
          sont en position:absolute centrés sur ce conteneur (cf.
          panelStyleDesktop) — le panneau actif est TOUJOURS ancré à
          left:50%/translateX(-50%), donc toujours centré sous les onglets
          quel que soit le profil. Hauteur en clamp pour suivre le ratio des
          captures (797/1600) sur la plage de largeurs du panneau actif. ── */}
      <div className="hdp-desktop" style={{ position: 'relative', height: 'clamp(300px, 29vw, 480px)', padding: '0 8px' }}>
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
