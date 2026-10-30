import { useColors } from '../../lib/theme'
import { localeOf } from '../../lib/translations'
import { alpha, fontSize, radius, spacing } from '../../tokens'
import Carte from './Carte'
import EmptyState from '../EmptyState'
import { IconMessage } from '../icones'

// Motif de terrain dessiné en SVG : aucune image à charger, net à toutes les
// tailles, et il prend la couleur du thème (traits en `currentColor`), donc
// lisible en clair comme en sombre. Les traits sont volontairement fins et
// pâles : l'en-tête reste un décor, le titre passe devant.
function MotifTerrain() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 160"
      preserveAspectRatio="xMaxYMid slice"
      style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: '70%', pointerEvents: 'none' }}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="20" y="16" width="360" height="128" rx="4" />
      <line x1="200" y1="16" x2="200" y2="144" />
      <circle cx="200" cy="80" r="26" />
      <circle cx="200" cy="80" r="2" fill="currentColor" />
      <rect x="20" y="46" width="48" height="68" />
      <rect x="20" y="62" width="18" height="36" />
      <rect x="332" y="46" width="48" height="68" />
      <rect x="362" y="62" width="18" height="36" />
    </svg>
  )
}

// Page "Actualités du club" du joueur : les annonces publiées par son club,
// les plus récentes d'abord. Utilisée par la branche navItems du dashboard.
//
// Le chargement et le marquage "lu" restent dans DashboardJoueur :
// `onLue(annonceId)` enregistre la lecture (sans effet si déjà lue).
export default function ActualitesJoueur({ annonces, luesIds, aUnClub, isMobile, lang, onLue, onNaviguer }) {
  const colors = useColors()
  const locale = localeOf(lang)

  const cadre = { padding: isMobile ? spacing['2xl'] : `${spacing['4xl']} 40px`, maxWidth: '980px', margin: '0 auto' }
  const nbNonLues = annonces.filter(a => !luesIds.has(a.id)).length

  const sousTitre = annonces.length === 0
    ? 'Rien de nouveau pour le moment.'
    : nbNonLues === 0
      ? 'Tu as tout lu.'
      : nbNonLues === 1 ? '1 annonce à lire.' : `${nbNonLues} annonces à lire.`

  return (
    <div style={cadre}>
      <Carte
        accent={colors.accent.green}
        isMobile={isMobile}
        style={{ position: 'relative', overflow: 'hidden', marginBottom: spacing['4xl'], minHeight: isMobile ? '112px' : '132px', display: 'flex', alignItems: 'center' }}
      >
        <div style={{ position: 'absolute', inset: 0, color: colors.accent.green, opacity: 0.22 }}>
          <MotifTerrain />
        </div>
        <div style={{ position: 'relative' }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? fontSize['6xl'] : fontSize['8xl'], fontWeight: 800, letterSpacing: '-0.5px', color: colors.text.primary }}>
            Actualités du club
          </h1>
          <p style={{ margin: `${spacing.md} 0 0`, fontSize: fontSize.xl, color: colors.text.secondary }}>{sousTitre}</p>
        </div>
      </Carte>

      {annonces.length === 0 ? (
        <EmptyState
          icon={<IconMessage />}
          title={aUnClub ? "Ton club n'a rien publié pour le moment" : 'Les actualités arrivent avec ton club'}
          subtitle={aUnClub
            ? "Dès que ton club publie une annonce (horaires, événements, informations utiles), tu la retrouves ici."
            : "Une fois dans une équipe, tu reçois ici les annonces de ton club."}
          cta={!aUnClub && onNaviguer ? { label: 'Rejoindre mon équipe', onClick: () => onNaviguer('equipe') } : undefined}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {annonces.map(a => {
            const lue = luesIds.has(a.id)
            const date = new Date(a.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
            return (
              <Carte
                key={a.id}
                isMobile={isMobile}
                onClick={lue ? undefined : () => onLue(a.id)}
                role={lue ? undefined : 'button'}
                tabIndex={lue ? undefined : 0}
                onKeyDown={lue ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onLue(a.id) } }}
                style={{ opacity: lue ? 0.85 : 1 }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.lg }}>
                  <h2 style={{ margin: 0, fontSize: fontSize['3xl'], fontWeight: 700, color: colors.text.primary, minWidth: 0, overflowWrap: 'anywhere' }}>{a.titre}</h2>
                  {!lue && (
                    <span style={{ flexShrink: 0, background: colors.accent.green + alpha.soft, color: colors.accent.green, borderRadius: radius.pill, padding: `${spacing.xs} ${spacing.base}`, fontSize: fontSize.base, fontWeight: 700 }}>
                      Nouveau
                    </span>
                  )}
                </div>
                <p style={{ margin: `${spacing.sm} 0 ${spacing.lg}`, fontSize: fontSize.md, color: colors.text.faint }}>
                  {a.auteur_nom} · {date}
                </p>
                <p style={{ margin: 0, fontSize: fontSize.lg, lineHeight: 1.6, color: colors.text.secondary, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{a.contenu}</p>
              </Carte>
            )
          })}
        </div>
      )}
    </div>
  )
}
