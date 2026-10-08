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

// Ordre d'affichage FIXE (gauche/centre/droite) — un clic change quel
// panneau est "actif" (agrandi, lumineux, premier plan) mais ne réordonne
// jamais les 3 colonnes, pour une transition prévisible plutôt qu'un
// réarrangement du layout à chaque clic.
const PROFILS = [
  { id: 'joueur', navKey: 'hero_preview_nav_joueur', msgKey: 'hero_preview_msg_joueur', color: colors.accent.green, image: dashboardJoueur, alt: 'Aperçu du dashboard Joueur Digital Football' },
  { id: 'educateur', navKey: 'hero_preview_nav_educateur', msgKey: 'hero_preview_msg_educateur', color: colors.accent.blue, image: dashboardEducateur, alt: 'Aperçu du dashboard Éducateur Digital Football' },
  { id: 'club', navKey: 'hero_preview_nav_club', msgKey: 'hero_preview_msg_club', color: colors.accent.purpleLight, image: dashboardClub, alt: 'Aperçu du dashboard Club Digital Football' },
]

// Desktop = grille 3 colonnes avec profondeur ; en dessous de 900px les 3
// colonnes deviennent trop étroites pour rester lisibles (cf. consigne
// tablette) — on bascule alors sur la même présentation qu'en mobile, un
// seul dashboard + onglets. Hover exclu sur tactile (cf. consigne dédiée) ;
// prefers-reduced-motion coupe toutes les transitions/animations plutôt que
// de les réduire, plus simple et sans perte de fonctionnalité (le
// changement d'onglet reste instantané).
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
    .hdp-panel-inactive:hover { filter: brightness(1.15); }
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

const panelStyle = (p, index, estActif) => ({
  flex: estActif ? '1.3 1 0' : '1 1 0',
  minWidth: 0,
  transform: estActif ? 'translateY(-10px) scale(1.04)' : 'translateY(10px) scale(0.94)',
  opacity: estActif ? 1 : 0.72,
  filter: estActif ? 'none' : 'brightness(0.75)',
  zIndex: estActif ? 2 : 1,
  transition: 'transform 0.32s cubic-bezier(0.22,1,0.36,1), opacity 0.32s ease, filter 0.32s ease, box-shadow 0.32s ease',
  background: colors.background.surface,
  border: `1px solid ${estActif ? p.color : colors.border.subtle}`,
  borderRadius: '14px',
  overflow: 'hidden',
  cursor: estActif ? 'default' : 'pointer',
  boxShadow: estActif ? `0 24px 60px -16px ${p.color}55, 0 0 0 1px ${p.color}30` : '0 8px 24px -12px rgba(0,0,0,0.5)',
  padding: 0,
  animationDelay: `${0.5 + index * 0.1}s`,
})

// Déclarés hors du composant (pas recréés à chaque rendu, cf.
// react-hooks/static-components) — état du profil actif reçu en props.
function Panels({ mobile, profilActif, setProfilActif, lang }) {
  const actif = PROFILS.find(p => p.id === profilActif)
  return (
    <>
      {(mobile ? [actif] : PROFILS).map((p, i) => {
        const estActif = p.id === profilActif
        return (
          <button
            key={p.id}
            type="button"
            className={`hdp-panel-btn hdp-panel ${!estActif ? 'hdp-panel-inactive' : ''}`}
            onClick={() => setProfilActif(p.id)}
            aria-pressed={estActif}
            aria-label={t(p.navKey, lang)}
            style={mobile
              ? { width: '100%', background: colors.background.surface, border: `1px solid ${p.color}`, borderRadius: '14px', overflow: 'hidden', padding: 0, cursor: 'default', boxShadow: `0 20px 48px -18px ${p.color}55` }
              : panelStyle(p, i, estActif)
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
    <div style={{ maxWidth: '1100px', margin: '3rem auto 0' }}>
      <style>{HDP_STYLE}</style>

      <div className="hdp-stagger" style={{ animationDelay: '0.45s' }}>
        <NavTabs profilActif={profilActif} setProfilActif={setProfilActif} lang={lang} />
      </div>

      {/* ── Desktop/tablette large : 3 colonnes, centre mis en avant ── */}
      <div className="hdp-desktop" style={{ gap: '18px', alignItems: 'center', padding: '0 8px' }}>
        <Panels mobile={false} profilActif={profilActif} setProfilActif={setProfilActif} lang={lang} />
      </div>

      {/* ── Tablette étroite/mobile : un seul dashboard, piloté par les onglets ci-dessus ── */}
      <div className="hdp-mobile hdp-stagger" style={{ animationDelay: '0.55s' }}>
        <Panels mobile={true} profilActif={profilActif} setProfilActif={setProfilActif} lang={lang} />
      </div>

      <p className="hdp-stagger" style={{ animationDelay: '0.65s', textAlign: 'center', color: actif.color, fontSize: '15px', fontWeight: 700, marginTop: '22px', marginBottom: 0, transition: 'color 0.3s ease' }}>
        {t(actif.msgKey, lang)}
      </p>
    </div>
  )
}
