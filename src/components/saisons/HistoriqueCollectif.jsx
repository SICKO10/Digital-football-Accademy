import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { useWindowWidth } from '../../hooks/useWindowWidth'
import { alpha, radius } from '../../tokens'
import { fetchToutesLignes, fetchToutesLignesIn } from '../../lib/supabasePagination'
import {
  saisonActuelle, saisonsAvecDonnees, aSaisonsPassees, bornesDatesSaison,
  libelleSaison, dateFr, MESSAGE_AUCUNE_SAISON_ARCHIVEE,
} from '../../lib/saison'
import {
  lignesJoueurs, classement, CRITERES_CLASSEMENT, minutesSaisies,
  presenceMoyenneEquipe, resumeSante, noteEquipe,
} from '../../lib/statsSaison'
import SelecteurSaison from './SelecteurSaison'
import StatsEquipe from '../StatsEquipe'
import HistoriqueIndividuel from './HistoriqueIndividuel'

// Historique collectif d'une saison pour le coach : tout est recalculé depuis
// les données datées (matchs, séances, blessures), rien n'est copié ailleurs.
// La saison en cours est proposée aussi (étiquetée « en cours ») pour pouvoir
// vérifier les chiffres avec les vraies données avant la première clôture.
export default function HistoriqueCollectif({ educateurId, equipeId, joueurs = [] }) {
  const colors = useColors()
  const isMobile = useWindowWidth() < 768
  const [dates, setDates] = useState(null)
  const [saison, setSaison] = useState(saisonActuelle())
  const [brut, setBrut] = useState(null)
  const [critere, setCritere] = useState('buts')
  const [vue, setVue] = useState('collectif')

  // Dates de tous les matchs et séances du coach (légères) pour savoir quelles saisons existent.
  useEffect(() => {
    if (!educateurId) return
    let annule = false
    ;(async () => {
      const lire = (table) => fetchToutesLignes(() => {
        let q = supabase.from(table).select('id, date').eq('educateur_id', educateurId).order('id')
        if (equipeId) q = q.eq('club_categorie_id', equipeId)
        return q
      })
      const [m, e] = await Promise.all([lire('matchs_equipe'), lire('entrainements')])
      if (annule) return
      setDates([...(m.data || []), ...(e.data || [])].map(x => x.date))
    })()
    return () => { annule = true }
  }, [educateurId, equipeId])

  // Données de la saison choisie.
  useEffect(() => {
    if (!educateurId) return
    let annule = false
    const cle = `${equipeId}|${saison}`
    ;(async () => {
      const { debut, fin } = bornesDatesSaison(saison)
      const scope = (q) => (equipeId ? q.eq('club_categorie_id', equipeId) : q)
      const [m, e] = await Promise.all([
        fetchToutesLignes(() => scope(supabase.from('matchs_equipe').select('*, stats_match(*)').eq('educateur_id', educateurId).gte('date', debut).lte('date', fin).order('id'))),
        fetchToutesLignes(() => scope(supabase.from('entrainements').select('*, presences_entrainement(*)').eq('educateur_id', educateurId).gte('date', debut).lte('date', fin).order('id'))),
      ])
      if (m.error || e.error) { if (!annule) setBrut({ cle, erreur: true }); return }
      const matchIds = m.data.map(x => x.id)
      const seanceIds = e.data.map(x => x.id)
      const joueurIds = joueurs.map(j => j.id)
      const [n, d, b] = await Promise.all([
        matchIds.length ? fetchToutesLignesIn(matchIds, ids => supabase.from('notations_match').select('id, joueur_id, note, match_id, est_note_equipe').eq('educateur_id', educateurId).in('match_id', ids).order('id')) : { data: [] },
        seanceIds.length ? fetchToutesLignesIn(seanceIds, ids => supabase.from('disponibilites').select('id, joueur_id, seance_id, statut').in('seance_id', ids).order('id')) : { data: [] },
        joueurIds.length ? supabase.from('blessures').select('id, equipe_joueur_id, statut, saison').eq('saison', saison).in('equipe_joueur_id', joueurIds) : { data: [] },
      ])
      if (annule) return
      const dispos = {}
      ;(d.data || []).forEach(x => { (dispos[x.seance_id] ||= {})[x.joueur_id] = x.statut })
      setBrut({ cle, matchs: m.data, entrainements: e.data, notations: n.data || [], dispos, blessures: b.data || [] })
    })()
    return () => { annule = true }
  }, [educateurId, equipeId, saison, joueurs])

  // Résultat valable seulement pour l'équipe et la saison affichées (sinon : chargement).
  const donnees = brut && brut.cle === `${equipeId}|${saison}` && !brut.erreur ? brut : null
  const erreur = !!brut && brut.cle === `${equipeId}|${saison}` && !!brut.erreur

  const saisons = useMemo(() => saisonsAvecDonnees(dates || []), [dates])

  // Effectif de la saison : l'effectif actuel, plus les joueurs qui ont des stats
  // cette saison-là mais qui ont quitté l'équipe depuis.
  const effectif = useMemo(() => {
    if (!donnees) return []
    const connus = new Set(joueurs.map(j => j.id))
    const anciens = new Set()
    donnees.matchs.forEach(m => (m.stats_match || []).forEach(s => { if (!connus.has(s.joueur_id)) anciens.add(s.joueur_id) }))
    return [...joueurs, ...[...anciens].map(id => ({ id, prenom: 'Ancien', nom: 'joueur' }))]
  }, [donnees, joueurs])

  const lignes = useMemo(() => donnees
    ? lignesJoueurs({ joueurs: effectif, matchs: donnees.matchs, entrainements: donnees.entrainements, dispos: donnees.dispos, notations: donnees.notations })
    : [], [donnees, effectif])

  const carte = { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: radius.lg, padding: isMobile ? 14 : '16px 18px', minWidth: 0 }
  const eyebrow = (texte) => (
    <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }}>{texte}</p>
  )
  const nonDispo = (texte = 'Non disponible pour cette saison.') => (
    <p style={{ margin: 0, fontSize: 13, color: colors.text.faint }}>{texte}</p>
  )

  const enCours = saison === saisonActuelle()
  const titreSaison = `Saison ${libelleSaison(saison)}${enCours ? ' (en cours)' : ''}`

  let contenu
  if (erreur) {
    contenu = <div style={carte}>{nonDispo('Impossible de charger cette saison. Réessaie dans un instant.')}</div>
  } else if (!donnees) {
    contenu = <p style={{ color: colors.text.faint, fontSize: 13 }}>Chargement…</p>
  } else if (!donnees.matchs.length && !donnees.entrainements.length) {
    contenu = <div style={{ ...carte, textAlign: 'center', padding: 28 }}>{nonDispo('Aucun match ni séance enregistré cette saison-là.')}</div>
  } else if (vue === 'individuel') {
    contenu = <HistoriqueIndividuel educateurId={educateurId} saison={saison} lignes={lignes} blessures={donnees.blessures} />
  } else {
    const matchsJoues = donnees.matchs.filter(m => m.score_nous !== null && m.score_nous !== '' && m.score_eux !== null && m.score_eux !== '')
      .sort((a, b) => b.date.localeCompare(a.date))
    const triActif = CRITERES_CLASSEMENT.find(c => c.key === critere) || CRITERES_CLASSEMENT[0]
    const rang = classement(lignes, critere)
    const maxRang = Math.max(...rang.map(r => r.valeur), 1)
    const sante = resumeSante(donnees.blessures)
    const presMoy = presenceMoyenneEquipe(lignes)
    const critereIndispo = (critere === 'minutes' || critere === 'victoires') && !minutesSaisies(lignes)
    const couleurRes = (m) => {
      const bp = parseInt(m.score_nous), bc = parseInt(m.score_eux)
      return bp > bc ? colors.accent.green : bp < bc ? colors.accent.red : colors.accent.amber
    }
    const chip = (actif) => ({ padding: '6px 14px', borderRadius: 16, border: `1px solid ${actif ? colors.accent.blue : colors.border.default}`, cursor: 'pointer', fontSize: 12, background: actif ? colors.accent.blue + alpha.subtle : 'transparent', color: actif ? colors.accent.blue : colors.text.faint, fontWeight: actif ? 700 : 500, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' })
    contenu = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 18 }}>
        <div style={carte}>
          {eyebrow('Effectif')}
          <p style={{ margin: 0, fontSize: 13, color: colors.text.secondary }}>
            {effectif.length} joueur{effectif.length > 1 ? 's' : ''} · {donnees.entrainements.length} séance{donnees.entrainements.length > 1 ? 's' : ''} · {matchsJoues.length} match{matchsJoues.length > 1 ? 's' : ''} joué{matchsJoues.length > 1 ? 's' : ''}
          </p>
          {!enCours && <p style={{ margin: '6px 0 0', fontSize: 11, color: colors.text.faint }}>L'effectif affiché est l'effectif actuel, plus les joueurs qui ont des stats cette saison-là.</p>}
        </div>

        <div>
          {eyebrow('Bilan et analyse des buts')}
          <StatsEquipe matchs={donnees.matchs} noteEquipe={noteEquipe(donnees.notations)} saison={saison} />
        </div>

        {matchsJoues.length > 0 && (
          <div style={carte}>
            {eyebrow('Résultats')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {matchsJoues.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <span style={{ width: 54, flexShrink: 0, color: colors.text.faint, fontSize: 12 }}>{dateFr(m.date)}</span>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.domicile ? 'vs' : 'à'} {m.adversaire || 'Adversaire'}</span>
                  <span style={{ fontWeight: 800, color: couleurRes(m), fontVariantNumeric: 'tabular-nums' }}>{m.score_nous} - {m.score_eux}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={carte}>
          {eyebrow('Classements')}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {CRITERES_CLASSEMENT.map(c => <button key={c.key} onClick={() => setCritere(c.key)} style={chip(critere === c.key)}>{c.label}</button>)}
          </div>
          {critereIndispo ? nonDispo('Les minutes jouées n\'ont pas été saisies cette saison-là.')
            : rang.length === 0 ? nonDispo()
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rang.map(({ ligne, valeur }, i) => (
                  <div key={ligne.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4, fontSize: 13 }}>
                      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><span style={{ color: colors.text.faint, marginRight: 8 }}>{i + 1}</span>{ligne.prenom} {ligne.nom}</span>
                      <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{Number.isInteger(valeur) ? valeur : valeur.toFixed(1)} <span style={{ fontWeight: 500, fontSize: 11, color: colors.text.faint }}>{triActif.unite}</span></span>
                    </div>
                    <div style={{ height: 5, background: colors.background.base, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(valeur / (critere === 'presence' ? 100 : critere === 'note' ? 10 : maxRang)) * 100}%`, background: colors.accent.blue, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)', gap: 10 }}>
          <div style={carte}>
            {eyebrow('Présence entraînement')}
            {presMoy === null ? nonDispo() : (
              <>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{presMoy}<span style={{ fontSize: 13, fontWeight: 600, color: colors.text.faint, marginLeft: 3 }}>% en moyenne</span></p>
                <p style={{ margin: '6px 0 0', fontSize: 12, color: colors.text.faint }}>{donnees.entrainements.length} séance{donnees.entrainements.length > 1 ? 's' : ''} sur la saison</p>
              </>
            )}
          </div>
          <div style={carte}>
            {eyebrow('Santé')}
            {sante.total === 0 ? nonDispo('Aucune blessure enregistrée cette saison-là.') : (
              <>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{sante.total}<span style={{ fontSize: 13, fontWeight: 600, color: colors.text.faint, marginLeft: 3 }}>blessure{sante.total > 1 ? 's' : ''}</span></p>
                <p style={{ margin: '6px 0 0', fontSize: 12, color: colors.text.faint }}>{sante.gueries} guérie{sante.gueries > 1 ? 's' : ''} · {sante.enCours} en cours · {sante.joueursTouches} joueur{sante.joueursTouches > 1 ? 's' : ''} touché{sante.joueursTouches > 1 ? 's' : ''}</p>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <SelecteurSaison saisons={saisons} valeur={saison} onChange={setSaison} />
        <span style={{ fontSize: 13, color: colors.text.faint }}>{titreSaison}</span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[['collectif', 'Collectif'], ['individuel', 'Individuel']].map(([cle, label]) => (
          <button key={cle} onClick={() => setVue(cle)} style={{ padding: '6px 14px', borderRadius: 16, border: `1px solid ${vue === cle ? colors.accent.blue : colors.border.default}`, cursor: 'pointer', fontSize: 12, background: vue === cle ? colors.accent.blue + alpha.subtle : 'transparent', color: vue === cle ? colors.accent.blue : colors.text.faint, fontWeight: vue === cle ? 700 : 500, fontFamily: 'Inter, sans-serif' }}>{label}</button>
        ))}
      </div>
      {dates && !aSaisonsPassees(saisons) && (
        <p style={{ margin: 0, fontSize: 12, color: colors.text.faint }}>{MESSAGE_AUCUNE_SAISON_ARCHIVEE}</p>
      )}
      {contenu}
    </div>
  )
}
