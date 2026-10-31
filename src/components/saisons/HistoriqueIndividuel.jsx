import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { useWindowWidth } from '../../hooks/useWindowWidth'
import { alpha, radius } from '../../tokens'
import { bornesDatesSaison, saisonActuelle, dateFr } from '../../lib/saison'
import { pourcentageVictoires, afficherCleanSheets, resumeSante } from '../../lib/statsSaison'
import { PERIODES, ASPECTS } from '../../constants/evaluation'
import TuileChiffre from '../joueur/TuileChiffre'

const METRIQUES_TESTS = [
  { key: 'cmj_cm', label: 'CMJ', unite: 'cm' },
  { key: 'sprint_10m_s', label: 'Sprint 10 m', unite: 's' },
  { key: 'sprint_30m_s', label: 'Sprint 30 m', unite: 's' },
  { key: 'test_30_15_kmh', label: '30-15 IFT', unite: 'km/h' },
]

// Historique individuel d'une saison : une fiche par joueur, à partir des
// données déjà chargées par HistoriqueCollectif (`lignes` = stats, présence et
// note de chaque joueur). Charge en plus l'évaluation, les tests physiques et,
// pour une saison close, la fiche figée de fin de saison.
export default function HistoriqueIndividuel({ educateurId, saison, lignes, blessures }) {
  const colors = useColors()
  const isMobile = useWindowWidth() < 768
  const [choisi, setChoisi] = useState(null)
  const [extra, setExtra] = useState(null)

  const ligne = lignes.find(l => l.id === choisi) || null
  const enCours = saison === saisonActuelle()

  // Une seule requête par joueur et saison choisis.
  useEffect(() => {
    if (!ligne || !educateurId) return
    let annule = false
    const cle = `${ligne.id}|${saison}`
    ;(async () => {
      const { debut, fin } = bornesDatesSaison(saison)
      const [ev, ts, fiche] = await Promise.all([
        supabase.from('evaluations_joueur').select('*').eq('equipe_joueur_id', ligne.id).eq('educateur_id', educateurId).eq('saison', saison),
        ligne.joueur_id
          ? supabase.from('tests_physiques').select('*').eq('joueur_id', ligne.joueur_id).eq('educateur_id', educateurId).gte('date_test', debut).lte('date_test', fin).order('date_test', { ascending: true })
          : { data: [] },
        !enCours && ligne.joueur_id
          ? supabase.from('historique_saisons').select('*').eq('joueur_id', ligne.joueur_id).eq('educateur_id', educateurId).eq('saison', saison).eq('cloturee', true).maybeSingle()
          : { data: null },
      ])
      if (annule) return
      if (ev.error || ts.error) { setExtra({ cle, erreur: true }); return }
      setExtra({ cle, evaluations: ev.data || [], tests: ts.data || [], fiche: fiche.data || null })
    })()
    return () => { annule = true }
  }, [ligne?.id, ligne?.joueur_id, educateurId, saison, enCours])

  const extraCourant = ligne && extra && extra.cle === `${ligne.id}|${saison}` ? extra : null
  const donnees = extraCourant && !extraCourant.erreur ? extraCourant : null
  const sante = useMemo(() => resumeSante((blessures || []).filter(b => ligne && b.equipe_joueur_id === ligne.id)), [blessures, ligne])

  const carte = { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: radius.lg, padding: isMobile ? 14 : '16px 18px', minWidth: 0 }
  const eyebrow = (texte) => (
    <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }}>{texte}</p>
  )
  const nonDispo = (texte = 'Non disponible pour cette saison.') => (
    <p style={{ margin: 0, fontSize: 13, color: colors.text.faint }}>{texte}</p>
  )

  if (!lignes.length) return <div style={carte}>{nonDispo('Aucun joueur dans l\'effectif de cette saison.')}</div>

  const nomComplet = (l) => `${l.prenom || ''} ${l.nom || ''}`.trim() || 'Joueur'
  const liste = [...lignes].sort((a, b) => nomComplet(a).localeCompare(nomComplet(b), 'fr'))

  const fiche = () => {
    const s = ligne.s
    const pv = pourcentageVictoires(s)
    const tuiles = [
      { libelle: 'Matchs joués', valeur: s.matchs },
      { libelle: 'Buts', valeur: s.buts },
      { libelle: 'Passes décisives', valeur: s.passes_dec },
      ...(afficherCleanSheets(ligne) ? [{ libelle: 'Clean sheets', valeur: s.clean_sheets }] : []),
      { libelle: 'Minutes', valeur: s.minutes > 0 ? s.minutes : 'n.d.' },
      { libelle: 'Victoires', valeur: pv === null ? 'n.d.' : `${pv} %`, couleur: pv === null ? undefined : colors.accent.green },
      { libelle: 'Cartons', valeur: `${s.cartons_j} J · ${s.cartons_r} R` },
      { libelle: 'Présence entr.', valeur: ligne.tx ? `${ligne.tx.taux} %` : 'n.d.' },
      { libelle: 'Note de match', valeur: ligne.note ? `${ligne.note.moyenne}/10` : 'n.d.' },
    ]
    const evals = donnees.evaluations
    const noteSaison = [...evals].sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')).find(e => e.note_globale_saison != null)
    const testsAffiches = donnees.tests
    const premier = testsAffiches[0]
    const dernier = testsAffiches[testsAffiches.length - 1]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(3, minmax(0,1fr))', gap: 10 }}>
          {tuiles.map(t => <TuileChiffre key={t.libelle} {...t} isMobile={isMobile} />)}
        </div>
        {s.minutes === 0 && <p style={{ margin: 0, fontSize: 11, color: colors.text.faint }}>n.d. : non disponible, les minutes n'ont pas été saisies pour ce joueur cette saison-là.</p>}

        <div style={carte}>
          {eyebrow('Note de saison')}
          {noteSaison
            ? <p style={{ margin: 0, fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{noteSaison.note_globale_saison}<span style={{ fontSize: 13, fontWeight: 600, color: colors.text.faint, marginLeft: 3 }}>/20</span></p>
            : nonDispo('Pas de note de saison saisie dans la fiche d\'évaluation.')}
          {donnees.fiche?.notes && <p style={{ margin: '10px 0 0', fontSize: 13, color: colors.text.secondary, fontStyle: 'italic' }}>« {donnees.fiche.notes} »</p>}
          {donnees.fiche && <p style={{ margin: '8px 0 0', fontSize: 11, color: colors.text.faint }}>Fiche de fin de saison clôturée le {dateFr(donnees.fiche.date_cloture?.slice(0, 10), { day: 'numeric', month: 'long', year: 'numeric' })} : {donnees.fiche.matchs_joues || 0} matchs, {donnees.fiche.buts || 0} buts, {donnees.fiche.passes_decisives || 0} passes au moment de la clôture.</p>}
        </div>

        <div style={carte}>
          {eyebrow('Fiche d\'évaluation')}
          {evals.length === 0 ? nonDispo('Aucune évaluation enregistrée cette saison-là.') : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {PERIODES.map(p => {
                const e = evals.find(x => x.periode === p.key)
                if (!e) return null
                return (
                  <div key={p.key}>
                    <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700 }}>{p.label}</p>
                    {ASPECTS.map(a => {
                      const forts = e[`${a.key}_points_forts`], axes = e[`${a.key}_a_ameliorer`]
                      if (!forts && !axes) return null
                      return (
                        <p key={a.key} style={{ margin: '0 0 4px', fontSize: 12, color: colors.text.secondary, lineHeight: 1.5 }}>
                          <strong style={{ color: colors.text.primary }}>{a.label}</strong>
                          {forts ? ` · Points forts : ${forts}` : ''}{axes ? ` · À améliorer : ${axes}` : ''}
                        </p>
                      )
                    })}
                    {(e.objectif_personnel || e.objectif_collectif) && (
                      <p style={{ margin: '0 0 4px', fontSize: 12, color: colors.text.faint }}>
                        {e.objectif_personnel ? `Objectif personnel : ${e.objectif_personnel}` : ''}{e.objectif_personnel && e.objectif_collectif ? ' · ' : ''}{e.objectif_collectif ? `Objectif collectif : ${e.objectif_collectif}` : ''}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={carte}>
          {eyebrow('Tests physiques')}
          {testsAffiches.length === 0 ? nonDispo('Aucun test physique cette saison-là.') : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0,1fr))', gap: 10 }}>
              {METRIQUES_TESTS.map(m => {
                const val = dernier?.[m.key], deb = premier?.[m.key]
                if (val == null) return null
                return (
                  <div key={m.key} style={{ fontSize: 13 }}>
                    <span style={{ color: colors.text.faint }}>{m.label}</span>{' '}
                    <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{val} {m.unite}</strong>
                    {testsAffiches.length > 1 && deb != null && <span style={{ fontSize: 11, color: colors.text.faint }}> (début de saison : {deb})</span>}
                  </div>
                )
              })}
              <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: 11, color: colors.text.faint }}>{testsAffiches.length} série{testsAffiches.length > 1 ? 's' : ''} de tests, dernière le {dateFr(dernier.date_test)}.</p>
            </div>
          )}
        </div>

        <div style={carte}>
          {eyebrow('Santé')}
          {sante.total === 0 ? nonDispo('Aucune blessure enregistrée cette saison-là.') : (
            <p style={{ margin: 0, fontSize: 13, color: colors.text.secondary }}>
              {sante.total} blessure{sante.total > 1 ? 's' : ''} · {sante.gueries} guérie{sante.gueries > 1 ? 's' : ''} · {sante.enCours} en cours
            </p>
          )}
        </div>
      </div>
    )
  }

  const chip = (actif) => ({ padding: '6px 14px', borderRadius: 16, border: `1px solid ${actif ? colors.accent.blue : colors.border.default}`, cursor: 'pointer', fontSize: 12, background: actif ? colors.accent.blue + alpha.subtle : 'transparent', color: actif ? colors.accent.blue : colors.text.faint, fontWeight: actif ? 700 : 500, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 18 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {liste.map(l => <button key={l.id} onClick={() => setChoisi(l.id)} style={chip(choisi === l.id)}>{nomComplet(l)}</button>)}
      </div>
      {!ligne && <p style={{ margin: 0, fontSize: 13, color: colors.text.faint }}>Choisis un joueur pour voir sa saison.</p>}
      {ligne && (!donnees
        ? <p style={{ color: colors.text.faint, fontSize: 13 }}>{extraCourant?.erreur ? 'Impossible de charger ce joueur. Réessaie dans un instant.' : 'Chargement…'}</p>
        : fiche())}
    </div>
  )
}
