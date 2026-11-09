import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { fontSize, radius, spacing } from '../tokens'
import { localeOf } from '../lib/translations'
import { dateParisAujourdhui, heureParis } from '../lib/seancePubliee'
import { IconTactic } from './icones'
import Carte from './joueur/Carte'
import TitreSection from './joueur/TitreSection'
import EmptyState from './EmptyState'
import TactipadViewer from './TactipadViewer'
import SchemaPleinEcran from './SchemaPleinEcran'

// Onglet « Entraînement » de la Préparation : la ou les séances que l'éducateur
// a publiées pour ce joueur. La base ne renvoie que ce que le joueur a le droit
// de voir (destinataire, affilié, jusqu'à 22h Paris le jour J) ; le filtre
// ci-dessous sert seulement quand la page reste ouverte au-delà de 22h.

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

function Procede({ p, colors, isMobile }) {
  // Téléphone en paysage : le terrain doit aussi tenir en hauteur.
  const ratioSchema = (p.schema_data?.terrain?.w && p.schema_data?.terrain?.h) ? p.schema_data.terrain.h / p.schema_data.terrain.w : 0.625
  const largeur = isMobile ? Math.max(260, Math.min(800, window.innerWidth - 2 * 48, (window.innerHeight - 120) / ratioSchema)) : 640
  const bloc = (titre, texte) => texte ? (
    <div>
      <p style={{ margin: `0 0 ${spacing.xs}`, fontSize: fontSize.base, fontWeight: 700, color: colors.text.faint }}>{titre}</p>
      <p style={{ margin: 0, fontSize: fontSize.lg, color: colors.text.primary, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{texte}</p>
    </div>
  ) : null
  const [pleinEcran, setPleinEcran] = useState(false)
  const infos = [p.duree && `${p.duree} min`, p.nb_joueurs && `${p.nb_joueurs} joueurs`].filter(Boolean).join(' · ')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl, paddingTop: spacing.xl, borderTop: `1px solid ${colors.border.subtle}` }}>
      <div>
        <p style={{ margin: 0, fontWeight: 800, fontSize: fontSize['2xl'], color: colors.text.primary }}>
          {p.numero ? `${p.numero}. ` : ''}{p.titre || 'Exercice'}
        </p>
        {infos && <p style={{ margin: `${spacing.xs} 0 0`, fontSize: fontSize.base, color: colors.text.faint }}>{infos}</p>}
      </div>
      {bloc('But', p.but)}
      {bloc('Organisation', p.organisation)}
      {bloc('Consignes', p.consignes)}
      {bloc('Critères de réalisation', p.criteres_realisation)}
      {bloc('Critères de réussite', p.criteres_reussite)}
      {p.schema_data ? (
        <div>
          <div style={{ overflowX: 'auto' }}>
            <TactipadViewer schema={p.schema_data} width={largeur} onLire={isMobile ? () => setPleinEcran('lecture') : null} />
          </div>
          <button onClick={() => setPleinEcran(true)}
            style={{ marginTop: spacing.lg, background: colors.accent.green, color: colors.black, border: 'none', borderRadius: radius.lg, padding: '10px 16px', fontWeight: 700, fontSize: fontSize.lg, cursor: 'pointer', fontFamily: 'inherit' }}>
            Voir en plein écran
          </button>
          {pleinEcran && <SchemaPleinEcran schema={p.schema_data} nom={p.titre} colors={colors} onFermer={() => setPleinEcran(false)} lectureAuto={pleinEcran === 'lecture'} />}
        </div>
      ) : p.schema_png ? (
        <img src={p.schema_png} alt={`Schéma : ${p.titre || 'exercice'}`} style={{ width: '100%', maxWidth: '640px', borderRadius: radius.base }} />
      ) : null}
    </div>
  )
}

export default function SeanceDuJourJoueur({ isMobile = false, lang = 'fr' }) {
  const colors = useColors()
  const locale = localeOf(lang)
  const [seances, setSeances] = useState([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    const charger = async () => {
      const { data, error } = await supabase.from('seances_publiees')
        .select('id, date_seance, heure, lieu, theme, procedes')
        .order('date_seance', { ascending: true })
      setErreur(!!error)
      setSeances(data || [])
      setLoading(false)
    }
    charger()
  }, [])

  if (loading) return <p style={{ color: colors.text.faint, fontSize: fontSize.lg, margin: 0 }}>Chargement...</p>
  if (erreur) return <p style={{ color: colors.text.faint, fontSize: fontSize.lg, margin: 0 }}>Impossible de charger la séance pour l'instant. Réessaie dans un instant.</p>

  const visibles = seances.filter(estOuverte)
  if (visibles.length === 0) {
    return (
      <EmptyState
        icon={<IconTactic />}
        title="Pas de séance publiée pour toi"
        subtitle="Quand ton éducateur publie la séance de ton prochain entraînement, tu la retrouves ici : consignes, critères et schémas animés. Elle disparaît à 22h le jour de l'entraînement."
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing['3xl'] }}>
      {visibles.map(s => (
        <Carte key={s.id} isMobile={isMobile} style={{ borderRadius: radius.xl }}>
          <TitreSection couleur={colors.accent.green}>Séance · {libelleJour(s.date_seance, locale)}</TitreSection>
          <h2 style={{ margin: 0, fontSize: fontSize['4xl'], color: colors.text.primary }}>{s.theme || "Séance d'entraînement"}</h2>
          <p style={{ margin: `${spacing.sm} 0 ${spacing.xl}`, fontSize: fontSize.base, color: colors.text.faint }}>
            {[s.heure && s.heure.slice(0, 5).replace(':', 'h'), s.lieu].filter(Boolean).join(' · ')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
            {(s.procedes || []).map((p, i) => <Procede key={`${p.numero}-${i}`} p={p} colors={colors} isMobile={isMobile} />)}
          </div>
        </Carte>
      ))}
    </div>
  )
}
