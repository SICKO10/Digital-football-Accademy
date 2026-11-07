import { useColors } from '../../lib/theme'
import EnTetePage from './EnTetePage'
import { localeOf } from '../../lib/translations'
import { alpha, fontSize, radius, spacing } from '../../tokens'
import Carte from './Carte'
import EmptyState from '../EmptyState'
import { IconMessage } from '../icones'

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
      <EnTetePage isMobile={isMobile} kicker="La vie de ton club" titre="Actualités du club" accentMot="club" sousTitre={sousTitre} style={{ marginBottom: spacing['4xl'] }} />

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
