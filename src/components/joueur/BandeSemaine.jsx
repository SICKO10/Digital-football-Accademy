import { useColors } from '../../lib/theme'
import { alpha, fontSize, radius, spacing } from '../../tokens'
import { localeOf } from '../../lib/translations'
import Carte from './Carte'
import TitreSection from './TitreSection'

// Bande "Ma semaine" — lundi à dimanche d'un coup d'œil : séances, match, rdv
// médical, et la présence déjà déclarée. C'est la première question du joueur
// qui ouvre l'application, et l'information était jusqu'ici éparpillée entre
// les alertes, le planning et la carte de convocation.
//
// Aucune requête : tout vient de ce que le dashboard a déjà chargé
// (planningEntrainements, planningMatchs, rdvsMedicaux).
//
// `presences` est une table { 'entrainement_<id>': statut, 'match_<id>': statut }
// limitée à ce que le dashboard connaît réellement, c'est-à-dire la réponse au
// prochain entraînement et au prochain match. Les autres jours n'affichent pas
// de présence plutôt que d'en inventer une.

// Pastille d'événement : la couleur suit le code de statut du projet (vert =
// séance, bleu = match, orange = santé), elle n'est jamais décorative.
function Pastille({ couleur, pleine }) {
  return (
    <span
      style={{
        width: '6px', height: '6px', borderRadius: '999px', flexShrink: 0,
        background: pleine ? couleur : 'transparent',
        border: `1.5px solid ${couleur}`,
      }}
    />
  )
}

export default function BandeSemaine({
  entrainements = [],
  matchs = [],
  rdvs = [],
  lundi,
  presences = {},
  lang = 'fr',
  isMobile = false,
  style,
}) {
  const colors = useColors()
  if (!lundi) return null

  const aujourdhui = new Date().toISOString().slice(0, 10)

  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${lundi}T12:00:00`)
    d.setDate(d.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const seancesDuJour = entrainements.filter(e => e.date === iso)
    const matchsDuJour = matchs.filter(m => m.date === iso)
    const rdvsDuJour = rdvs.filter(r => r.date_consultation === iso)
    return {
      iso,
      initiale: d.toLocaleDateString(localeOf(lang), { weekday: 'narrow' }),
      numero: d.getDate(),
      estAujourdhui: iso === aujourdhui,
      seances: seancesDuJour,
      matchs: matchsDuJour,
      rdvs: rdvsDuJour,
      vide: seancesDuJour.length === 0 && matchsDuJour.length === 0 && rdvsDuJour.length === 0,
    }
  })

  const nbSeances = jours.reduce((n, j) => n + j.seances.length, 0)
  const nbMatchs = jours.reduce((n, j) => n + j.matchs.length, 0)

  // Résumé en une ligne, au singulier ou au pluriel, sans rien afficher quand
  // la semaine est vide (le joueur voit alors la grille grise, ce qui dit déjà
  // qu'il n'y a rien).
  const morceaux = []
  if (nbSeances > 0) morceaux.push(`${nbSeances} séance${nbSeances > 1 ? 's' : ''}`)
  if (nbMatchs > 0) morceaux.push(`${nbMatchs} match${nbMatchs > 1 ? 's' : ''}`)
  const resume = morceaux.length > 0 ? morceaux.join(' · ') : 'Rien de prévu cette semaine'

  // Présence déjà déclarée, uniquement pour les événements dont le dashboard
  // connaît la réponse.
  const declarees = []
  jours.forEach(j => {
    j.seances.forEach(s => {
      const st = presences[`entrainement_${s.id}`]
      if (st) declarees.push({ jour: j, statut: st, quoi: 'séance' })
    })
    j.matchs.forEach(m => {
      const st = presences[`match_${m.id}`]
      if (st) declarees.push({ jour: j, statut: st, quoi: 'match' })
    })
  })

  const LIBELLE_STATUT = { present: 'présent', absent: 'absent', blesse: 'blessé', malade: 'malade', convoque: 'convoqué' }
  const COULEUR_STATUT = {
    present: colors.accent.green, absent: colors.accent.red, blesse: colors.accent.orange,
    malade: colors.accent.purple, convoque: colors.accent.blue,
  }

  return (
    <Carte isMobile={isMobile} style={style}>
      <TitreSection>Ma semaine</TitreSection>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: spacing.md }}>
        {jours.map(j => (
          <div
            key={j.iso}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.md,
              padding: `${spacing.lg} ${spacing.xs}`,
              borderRadius: radius.xl,
              background: j.estAujourdhui ? colors.accent.green + alpha.faint : colors.background.raised,
              border: `1px solid ${j.estAujourdhui ? colors.accent.green + alpha.light : colors.border.subtle}`,
              minWidth: 0,
            }}
          >
            <span style={{ fontSize: fontSize.base, fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase' }}>
              {j.initiale}
            </span>
            <span
              style={{
                fontSize: fontSize['2xl'], fontWeight: 800, lineHeight: 1,
                color: j.estAujourdhui ? colors.accent.green : j.vide ? colors.text.disabled : colors.text.primary,
              }}
            >
              {j.numero}
            </span>
            <span style={{ display: 'flex', gap: '3px', height: '6px', alignItems: 'center' }}>
              {j.seances.slice(0, 2).map(s => (
                <Pastille key={`s${s.id}`} couleur={colors.accent.green} pleine={presences[`entrainement_${s.id}`] === 'present'} />
              ))}
              {j.matchs.slice(0, 2).map(m => (
                <Pastille key={`m${m.id}`} couleur={colors.accent.blue} pleine={presences[`match_${m.id}`] === 'present'} />
              ))}
              {j.rdvs.slice(0, 1).map(r => (
                <Pastille key={`r${r.id}`} couleur={colors.accent.orange} pleine />
              ))}
            </span>
          </div>
        ))}
      </div>

      <p style={{ margin: `${spacing['2xl']} 0 0`, fontSize: fontSize.lg, color: colors.text.secondary }}>
        {resume}
      </p>

      {declarees.map((d, i) => (
        <p key={i} style={{ margin: `${spacing.md} 0 0`, fontSize: fontSize.md, color: colors.text.faint }}>
          Tu t'es déclaré{' '}
          <span style={{ color: COULEUR_STATUT[d.statut] || colors.text.secondary, fontWeight: 700 }}>
            {LIBELLE_STATUT[d.statut] || d.statut}
          </span>{' '}
          pour le {d.quoi} du {new Date(`${d.jour.iso}T12:00:00`).toLocaleDateString(localeOf(lang), { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      ))}
    </Carte>
  )
}
