import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { fontSize, radius, spacing } from '../../tokens'
import { labelCategorie } from '../../lib/categories'
import { localeOf } from '../../lib/translations'
import { grouperAgendaParDate, indexerReponses, cleReponse } from '../../lib/categoriesJoueur'
import Carte from '../joueur/Carte'
import TitreSection from '../joueur/TitreSection'

// Espace joueur, catégorie en effectif commun (bloc 6 du chantier catégories) :
// le joueur répond à la DATE (« Je suis là samedi 21 » / « Absent »), l'éducateur
// le répartit ensuite. Il voit les séances et matchs de toutes les équipes de sa
// catégorie ce jour-là. Rien ne s'affiche en mode par équipe (agenda vide) ni si
// la fonction de la base n'est pas encore en place.
export default function SondageCategorie({ userId, readOnly = false, isMobile = false, lang = 'fr' }) {
  const colors = useColors()
  const [groupes, setGroupes] = useState([])
  const [reponses, setReponses] = useState({})
  const [enCours, setEnCours] = useState(null)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    if (!userId) return
    let annule = false
    ;(async () => {
      const { data: agenda, error } = await supabase.rpc('categories_joueur_agenda', { p_jours: 30 })
      if (annule || error || !agenda?.length) return
      const liste = grouperAgendaParDate(agenda)
      const { data: rep } = await supabase.from('disponibilites_categorie')
        .select('categorie_id, date, statut').eq('joueur_id', userId)
        .gte('date', liste[0].date)
      if (annule) return
      setReponses(indexerReponses(rep))
      setGroupes(liste)
    })()
    return () => { annule = true }
  }, [userId])

  if (groupes.length === 0) return null

  const repondre = async (g, statut) => {
    if (readOnly) return
    const cle = cleReponse(g.categorie_id, g.date)
    const avant = reponses[cle]
    setErreur('')
    setEnCours(cle)
    setReponses(prev => ({ ...prev, [cle]: statut }))
    const { error } = await supabase.from('disponibilites_categorie').upsert(
      { joueur_id: userId, categorie_id: g.categorie_id, date: g.date, statut, updated_at: new Date().toISOString() },
      { onConflict: 'joueur_id,categorie_id,date' }
    )
    setEnCours(null)
    if (error) {
      setReponses(prev => ({ ...prev, [cle]: avant }))
      setErreur('Ta réponse n\'a pas été envoyée. Réessaie dans un instant.')
    }
  }

  const jourLong = (d) => new Date(`${d}T12:00:00`).toLocaleDateString(localeOf(lang), { weekday: 'long', day: 'numeric', month: 'long' })
  const vert = colors.accent.green
  const rouge = colors.accent.red

  const bouton = (actif, couleur) => ({
    flex: 1, minHeight: '44px', padding: `${spacing.base} ${spacing.lg}`, borderRadius: radius.base,
    border: `1px solid ${actif ? couleur : colors.border.subtle}`,
    background: actif ? couleur : 'transparent',
    color: actif ? colors.background.base : colors.text.primary,
    fontSize: fontSize.xl, fontWeight: 700, cursor: readOnly ? 'default' : 'pointer', fontFamily: 'inherit',
  })

  return (
    <Carte isMobile={isMobile} style={{ marginBottom: isMobile ? spacing['2xl'] : spacing['3xl'] }}>
      <TitreSection style={{ margin: `0 0 ${spacing.md}` }}>
        Ta catégorie {labelCategorie(groupes[0].categorie_nom)}
      </TitreSection>
      <p style={{ margin: `0 0 ${spacing.lg}`, color: colors.text.secondary, fontSize: fontSize.base, lineHeight: 1.5 }}>
        Réponds à la date : ton éducateur te place ensuite dans l'équipe qui joue ou s'entraîne.
      </p>
      {groupes.map((g, i) => {
        const cle = cleReponse(g.categorie_id, g.date)
        const rep = reponses[cle]
        return (
          <div key={cle} style={{ padding: `${spacing.lg} 0`, borderTop: i === 0 ? 'none' : `1px solid ${colors.border.subtle}` }}>
            <div style={{ fontSize: fontSize.xl, fontWeight: 700, color: colors.text.primary, textTransform: 'capitalize' }}>{jourLong(g.date)}</div>
            <ul style={{ listStyle: 'none', margin: `${spacing.sm} 0 ${spacing.base}`, padding: 0, color: colors.text.secondary, fontSize: fontSize.base, lineHeight: 1.6 }}>
              {g.evenements.map(e => (
                <li key={`${e.type}${e.id}`}>
                  {e.heure ? `${String(e.heure).slice(0, 5)} · ` : ''}
                  {e.type === 'match' ? `Match ${e.titre ? `contre ${e.titre}` : ''}` : 'Entraînement'}
                  {e.equipe ? ` · ${e.equipe}` : ''}
                  {e.lieu ? ` · ${e.lieu}` : ''}
                </li>
              ))}
            </ul>
            {!readOnly && (
              <div style={{ display: 'flex', gap: spacing.base }}>
                <button type="button" disabled={enCours === cle} aria-pressed={rep === 'present'} onClick={() => repondre(g, 'present')} style={bouton(rep === 'present', vert)}>
                  Je suis là {jourLong(g.date).split(' ').slice(0, 2).join(' ')}
                </button>
                <button type="button" disabled={enCours === cle} aria-pressed={rep === 'absent'} onClick={() => repondre(g, 'absent')} style={bouton(rep === 'absent', rouge)}>
                  Absent
                </button>
              </div>
            )}
            {readOnly && rep && (
              <div style={{ fontSize: fontSize.base, color: rep === 'present' ? vert : rouge, fontWeight: 700 }}>
                {rep === 'present' ? 'Présent' : 'Absent'}
              </div>
            )}
          </div>
        )
      })}
      {erreur && <p role="alert" style={{ margin: `${spacing.base} 0 0`, color: rouge, fontSize: fontSize.base }}>{erreur}</p>}
    </Carte>
  )
}
