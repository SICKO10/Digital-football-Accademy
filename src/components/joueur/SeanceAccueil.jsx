import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { localeOf } from '../../lib/translations'
import { dateParisAujourdhui, heureParis } from '../../lib/seancePubliee'
import { fontSize, forme, spacing } from '../../tokens'
import Carte from './Carte'
import TitreSection from './TitreSection'

// « Séance du jour » de l'accueil : version courte de SeanceDuJourJoueur (la
// séance complète, avec ses exercices et ses schémas, reste dans Progresser,
// Entraînement). Même requête, même règle de visibilité : la base ne renvoie
// que les séances publiées pour ce joueur, et l'on masque celles du jour après
// 22h Paris si la page reste ouverte.
//
// Trois cas, toujours une phrase + une action :
//   - une séance publiée : jour, thème, heure et lieu, nombre d'exercices ;
//   - pas de séance publiée mais un entraînement prévu : ses infos et la mention
//     que la séance n'est pas encore publiée ;
//   - rien : « Aucune séance prévue ».
// Le parent n'affiche ce bloc que pour un joueur rattaché à une équipe.

const JOUR_MS = 24 * 3600 * 1000

const estOuverte = (s) => {
  const aujourdhui = dateParisAujourdhui()
  return s.date_seance > aujourdhui || (s.date_seance === aujourdhui && heureParis() < 22)
}

const libelleJour = (dateSeance, locale) => {
  const aujourdhui = dateParisAujourdhui()
  if (dateSeance === aujourdhui) return "Aujourd'hui"
  const demain = new Date(new Date(`${aujourdhui}T12:00:00Z`).getTime() + JOUR_MS).toISOString().slice(0, 10)
  if (dateSeance === demain) return 'Demain'
  return new Date(`${dateSeance}T12:00:00Z`).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
}

const heureCourte = (h) => (h ? h.slice(0, 5).replace(':', 'h') : null)

export default function SeanceAccueil({ prochainEntrainement, onOuvrir, isMobile = false, lang = 'fr', style }) {
  const colors = useColors()
  const locale = localeOf(lang)
  const [seances, setSeances] = useState(null) // null = chargement, [] = rien
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    let annule = false
    supabase.from('seances_publiees')
      .select('id, date_seance, heure, lieu, theme, procedes')
      .order('date_seance', { ascending: true })
      .then(({ data, error }) => {
        if (annule) return
        setErreur(!!error)
        setSeances(data || [])
      })
    return () => { annule = true }
  }, [])

  // Pas de carte « Chargement » qui clignote : le bloc apparaît quand il sait quoi dire.
  if (seances === null) return null

  const prochaine = seances.filter(estOuverte)[0] || null

  let titre, ligne1, ligne2, action
  if (prochaine) {
    const nb = (prochaine.procedes || []).length
    titre = `Séance · ${libelleJour(prochaine.date_seance, locale)}`
    ligne1 = prochaine.theme || "Séance d'entraînement"
    ligne2 = [heureCourte(prochaine.heure), prochaine.lieu, nb > 0 ? `${nb} exercice${nb > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ')
    action = 'Voir la séance'
  } else if (prochainEntrainement) {
    titre = `Entraînement · ${libelleJour(prochainEntrainement.date, locale)}`
    ligne1 = prochainEntrainement.description || 'Entraînement'
    ligne2 = [heureCourte(prochainEntrainement.heure), prochainEntrainement.lieu].filter(Boolean).join(' · ')
    action = 'Voir mes séances'
  } else {
    titre = 'Séance du jour'
    ligne1 = erreur ? 'Séance indisponible pour l’instant' : 'Aucune séance prévue'
    ligne2 = erreur ? 'Réessaie dans un instant.' : 'Ton éducateur publiera ici la séance de ton prochain entraînement.'
    action = 'Voir mes séances'
  }

  return (
    <Carte niveau="discret" isMobile={isMobile} style={{ borderLeft: `${forme.lisere} solid ${colors.accent.green}`, ...style }}>
      <TitreSection>{titre}</TitreSection>
      <p style={{ margin: 0, fontSize: isMobile ? fontSize['5xl'] : fontSize['6xl'], fontWeight: 700, lineHeight: 1.25, color: colors.text.primary }}>{ligne1}</p>
      {ligne2 && <p style={{ margin: `${spacing.sm} 0 0`, fontSize: fontSize['2xl'], color: colors.text.secondary }}>{ligne2}</p>}
      <button
        onClick={onOuvrir}
        style={{
          marginTop: spacing.lg, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
          color: colors.accent.green, fontWeight: 700, fontSize: fontSize['2xl'], fontFamily: 'Barlow, sans-serif',
        }}
      >
        {action} →
      </button>
    </Carte>
  )
}
