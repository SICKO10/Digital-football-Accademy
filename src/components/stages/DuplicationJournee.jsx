import { useState } from 'react'
import { supabase } from '../../supabase'
import { formatDate } from '../../lib/stages'

// Panneau « Dupliquer une journée » (onglets Planning et Organisation) :
// copie les créneaux du programme et/ou les tâches datées d'un jour vers
// d'autres jours, en ajoutant ou en remplaçant leur contenu. Les tâches
// copiées repartent « à faire » ; les tâches « tous les jours » (sans date)
// ne sont pas recopiées, elles figurent déjà partout. Toutes les écritures
// passent par les règles d'accès habituelles.
export default function DuplicationJournee({ st, colors, stage, jours, sourceInitiale, creneaux, taches, setCreneaux, setTaches, onFermer }) {
  const [d, setD] = useState({ source: sourceInitiale || jours[0], cibles: [], creneaux: true, taches: true, remplacer: false, enCours: false, erreur: '' })
  const autres = jours.filter(j => j !== d.source)

  const copier = async () => {
    if (d.cibles.length === 0) return setD(x => ({ ...x, erreur: 'Choisis au moins un jour de destination.' }))
    if (!d.creneaux && !d.taches) return setD(x => ({ ...x, erreur: 'Choisis ce qu\'il faut copier.' }))
    const sourcesC = d.creneaux ? creneaux.filter(c => c.date === d.source) : []
    const sourcesT = d.taches ? taches.filter(t => t.date === d.source) : []
    if (sourcesC.length + sourcesT.length === 0) return setD(x => ({ ...x, erreur: 'Rien à copier sur cette journée (les tâches « tous les jours » figurent déjà partout).' }))
    if (d.remplacer && !window.confirm(`Remplacer le contenu de ${d.cibles.length} jour(s) ? Les ${d.creneaux && d.taches ? 'créneaux et tâches' : d.creneaux ? 'créneaux' : 'tâches'} déjà présents sur ces jours seront supprimés.`)) return
    setD(x => ({ ...x, enCours: true, erreur: '' }))
    try {
      if (d.remplacer) {
        if (d.creneaux) { const { error } = await supabase.from('stages_planning').delete().eq('stage_id', stage.id).in('date', d.cibles); if (error) throw error }
        if (d.taches) { const { error } = await supabase.from('stages_taches').delete().eq('stage_id', stage.id).in('date', d.cibles); if (error) throw error }
      }
      let nouveauxC = [], nouveauxT = []
      if (sourcesC.length) {
        const lignes = d.cibles.flatMap(date => sourcesC.map(c => ({
          stage_id: stage.id, date, heure_debut: c.heure_debut, heure_fin: c.heure_fin, activite: c.activite, lieu: c.lieu,
          responsable: c.responsable, groupe: c.groupe, plan_b: c.plan_b, notes: c.notes, couleur: c.couleur,
        })))
        const { data, error } = await supabase.from('stages_planning').insert(lignes).select()
        if (error) throw error
        nouveauxC = data || []
      }
      if (sourcesT.length) {
        const lignes = d.cibles.flatMap(date => sourcesT.map(t => ({
          stage_id: stage.id, date, tache: t.tache, categorie: t.categorie, heure_debut: t.heure_debut, heure_fin: t.heure_fin,
          statut: 'a_faire', notes: t.notes, encadrant_ids: t.encadrant_ids || [], tous_encadrants: !!t.tous_encadrants,
        })))
        const { data, error } = await supabase.from('stages_taches').insert(lignes).select()
        if (error) throw error
        nouveauxT = data || []
      }
      const trier = (a, b) => `${a.date || ''}${a.heure_debut || ''}`.localeCompare(`${b.date || ''}${b.heure_debut || ''}`)
      if (d.creneaux) setCreneaux(prev => [...(d.remplacer ? prev.filter(c => !d.cibles.includes(c.date)) : prev), ...nouveauxC].sort(trier))
      if (d.taches) setTaches(prev => [...(d.remplacer ? prev.filter(t => !d.cibles.includes(t.date)) : prev), ...nouveauxT].sort(trier))
      onFermer(`${nouveauxC.length + nouveauxT.length} élément(s) copié(s) vers ${d.cibles.length} jour(s).`)
    } catch (e) {
      setD(x => ({ ...x, enCours: false, erreur: 'Duplication impossible : ' + e.message }))
    }
  }

  const pastille = (actif) => ({
    padding: '6px 11px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif', textTransform: 'capitalize',
    background: actif ? '#60a5fa22' : 'transparent', border: `1px solid ${actif ? '#60a5fa' : colors.border.default}`, color: actif ? '#60a5fa' : colors.text.dim,
  })
  const coche = (j) => setD(x => ({ ...x, cibles: x.cibles.includes(j) ? x.cibles.filter(y => y !== j) : [...x.cibles, j] }))
  const nbSource = (d.creneaux ? creneaux.filter(c => c.date === d.source).length : 0) + (d.taches ? taches.filter(t => t.date === d.source).length : 0)

  return (
    <div style={{ ...st.carte, margin: '0 0 14px', border: '1px solid #60a5fa66' }}>
      <p style={{ margin: '0 0 10px', fontSize: '15px', fontWeight: 800, color: colors.text.primary }}>Dupliquer une journée</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', color: colors.text.dim }}>Journée à copier :</span>
        <select value={d.source} onChange={e => setD(x => ({ ...x, source: e.target.value, cibles: x.cibles.filter(c => c !== e.target.value) }))} style={{ ...st.input, width: 'auto', textTransform: 'capitalize' }}>
          {jours.map(j => <option key={j} value={j}>{formatDate(j, { weekday: 'long', day: 'numeric', month: 'long' })}</option>)}
        </select>
        <span style={{ fontSize: '12px', color: colors.text.faint }}>{nbSource} élément(s) à copier</span>
      </div>
      <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 700, color: colors.text.primary }}>Vers les jours :</p>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setD(x => ({ ...x, cibles: x.cibles.length === autres.length ? [] : autres }))} style={pastille(d.cibles.length === autres.length && autres.length > 0)}>Tous les autres jours</button>
        {autres.map(j => <button key={j} type="button" onClick={() => coche(j)} style={pastille(d.cibles.includes(j))}>{formatDate(j, { weekday: 'short', day: 'numeric', month: 'short' })}</button>)}
      </div>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '12px', fontSize: '13px', color: colors.text.dim }}>
        <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={d.creneaux} onChange={e => setD(x => ({ ...x, creneaux: e.target.checked }))} /> Créneaux du programme</label>
        <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={d.taches} onChange={e => setD(x => ({ ...x, taches: e.target.checked }))} /> Tâches</label>
        <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={d.remplacer} onChange={e => setD(x => ({ ...x, remplacer: e.target.checked }))} /> Remplacer le contenu existant de ces jours</label>
      </div>
      {d.erreur && <p style={st.erreur}>{d.erreur}</p>}
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
        <button onClick={copier} disabled={d.enCours} style={{ ...st.boutonPlein, padding: '8px 16px', opacity: d.enCours ? 0.6 : 1 }}>{d.enCours ? 'Copie…' : `Copier${d.cibles.length ? ` vers ${d.cibles.length} jour(s)` : ''}`}</button>
        <button onClick={() => onFermer('')} style={st.boutonDiscret}>Annuler</button>
      </div>
    </div>
  )
}

// « Supprimer les doublons » : sur un même jour, deux créneaux (même horaire,
// activité, lieu, groupe et responsable) ou deux tâches (même intitulé,
// horaire et catégorie) identiques sont des doublons, typiquement après une
// duplication lancée deux fois. On garde un seul exemplaire — pour les
// tâches, celle dont l'avancement est le plus grand — et on supprime le reste.
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
const RANG_STATUT = { fait: 2, en_cours: 1, a_faire: 0 }

const enTrop = (liste, cle, meilleur = () => 0) => {
  const gardes = new Map()
  const aSupprimer = []
  for (const x of liste) {
    const k = cle(x)
    const g = gardes.get(k)
    if (!g) { gardes.set(k, x); continue }
    if (meilleur(x) > meilleur(g)) { aSupprimer.push(g.id); gardes.set(k, x) } else aSupprimer.push(x.id)
  }
  return aSupprimer
}

const doublonsStage = (creneaux, taches) => ({
  creneaux: enTrop(creneaux, c => [c.date, c.heure_debut, c.heure_fin, norm(c.activite), norm(c.lieu), norm(c.groupe), norm(c.responsable)].join('|')),
  taches: enTrop(taches, t => [t.date || 'tous', t.heure_debut, t.heure_fin, norm(t.tache), t.categorie].join('|'), t => RANG_STATUT[t.statut] || 0),
})

export function BoutonDoublons({ st, stage, creneaux, taches, setCreneaux, setTaches, onMessage }) {
  const [enCours, setEnCours] = useState(false)
  const { creneaux: idsC, taches: idsT } = doublonsStage(creneaux, taches)
  const total = idsC.length + idsT.length
  if (total === 0) return null

  const supprimer = async () => {
    const detail = [idsC.length && `${idsC.length} créneau(x)`, idsT.length && `${idsT.length} tâche(s)`].filter(Boolean).join(' et ')
    if (!window.confirm(`Supprimer ${detail} en double ? Un exemplaire de chaque est conservé.`)) return
    setEnCours(true)
    try {
      if (idsC.length) { const { error } = await supabase.from('stages_planning').delete().eq('stage_id', stage.id).in('id', idsC); if (error) throw error }
      if (idsT.length) { const { error } = await supabase.from('stages_taches').delete().eq('stage_id', stage.id).in('id', idsT); if (error) throw error }
      setCreneaux(prev => prev.filter(c => !idsC.includes(c.id)))
      setTaches(prev => prev.filter(t => !idsT.includes(t.id)))
      onMessage(`${total} doublon(s) supprimé(s).`)
    } catch (e) {
      onMessage('Suppression impossible : ' + e.message)
    }
    setEnCours(false)
  }

  return (
    <button onClick={supprimer} disabled={enCours} style={{ ...st.bouton, color: '#f87171', borderColor: '#f8717166', opacity: enCours ? 0.6 : 1 }}>
      {enCours ? 'Suppression…' : `Supprimer les doublons (${total})`}
    </button>
  )
}
