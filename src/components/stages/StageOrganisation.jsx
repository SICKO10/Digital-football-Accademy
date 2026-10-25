import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { joursDuStage, formatJourCourt, formatDate, heure, CATEGORIES_TACHE, STATUTS_TACHE, elementsPlanningEncadrant } from '../../lib/stages'
import { telechargerPlanningEncadrants } from '../../lib/stagesPdf'
import DuplicationJournee, { BoutonDoublons } from './DuplicationJournee'

// Onglet « Organisation » (interne, jamais public) : encadrants et leurs
// responsabilités, matériel à réunir, tâches, et planning individuel de
// chaque encadrant (ses tâches + les créneaux du programme dont il est
// indiqué responsable).

const STATUTS_MATERIEL = { a_trouver: 'À trouver', demande: 'Demandé', obtenu: 'Obtenu' }
const SUIVANT_MATERIEL = { a_trouver: 'demande', demande: 'obtenu', obtenu: 'a_trouver' }
const SUIVANT_TACHE = { a_faire: 'en_cours', en_cours: 'fait', fait: 'a_faire' }


export default function StageOrganisation({ st, colors, accent, stage }) {
  const [encadrants, setEncadrants] = useState([])
  const [materiel, setMateriel] = useState([])
  const [taches, setTaches] = useState([])
  const [creneaux, setCreneaux] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [clubNom, setClubNom] = useState('')

  useEffect(() => {
    let annule = false
    Promise.all([
      supabase.from('stages_encadrants').select('*').eq('stage_id', stage.id).order('nom'),
      supabase.from('stages_materiel').select('*').eq('stage_id', stage.id).order('created_at'),
      supabase.from('stages_taches').select('*').eq('stage_id', stage.id).order('date').order('heure_debut'),
      supabase.from('stages_planning').select('id, date, heure_debut, heure_fin, activite, lieu, responsable, groupe').eq('stage_id', stage.id).order('date').order('heure_debut'),
      supabase.from('profiles_public').select('club').eq('id', stage.club_id).maybeSingle(),
    ]).then(([e, m, t, p, c]) => {
      if (annule) return
      const err = e.error || m.error || t.error || p.error
      if (err) setErreur('Chargement impossible : ' + err.message)
      setEncadrants(e.data || []); setMateriel(m.data || []); setTaches(t.data || []); setCreneaux(p.data || [])
      setClubNom(c.data?.club || '')
      setChargement(false)
    })
    return () => { annule = true }
  }, [stage.id, stage.club_id])

  if (chargement) return <p style={{ color: colors.text.faint, fontSize: '13px' }}>Chargement…</p>
  const commun = { st, colors, accent, stage, encadrants, setErreur }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {erreur && <p style={st.erreur}>{erreur}</p>}
      <Encadrants {...commun} setEncadrants={setEncadrants} setTaches={setTaches} />
      <Materiel {...commun} materiel={materiel} setMateriel={setMateriel} />
      <Taches {...commun} taches={taches} setTaches={setTaches} creneaux={creneaux} setCreneaux={setCreneaux} />
      <PlanningEncadrant {...commun} taches={taches} creneaux={creneaux} clubNom={clubNom} />
    </div>
  )
}

function Bloc({ st, colors, titre, aide, droite, children }) {
  return (
    <div style={st.carte}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontWeight: 800, fontSize: '15px', color: colors.text.primary }}>{titre}</p>
        {droite}
      </div>
      {aide && <p style={{ margin: '4px 0 12px', fontSize: '12px', color: colors.text.faint }}>{aide}</p>}
      {children}
    </div>
  )
}

const petit = (st, extra = {}) => ({ ...st.boutonDiscret, padding: '4px 10px', fontSize: '12px', ...extra })

function Encadrants({ st, colors, stage, encadrants, setEncadrants, setTaches, setErreur }) {
  const [edition, setEdition] = useState(null)

  const enregistrer = async () => {
    if (!edition.nom.trim()) return setErreur('Indique le nom de l\'encadrant.')
    const valeurs = { nom: edition.nom.trim(), role: edition.role.trim() || null, telephone: edition.telephone.trim() || null }
    const { data, error } = edition.id
      ? await supabase.from('stages_encadrants').update(valeurs).eq('id', edition.id).select().single()
      : await supabase.from('stages_encadrants').insert({ ...valeurs, stage_id: stage.id }).select().single()
    if (error) return setErreur('Enregistrement impossible : ' + error.message)
    setErreur('')
    setEncadrants(prev => (edition.id ? prev.map(x => x.id === data.id ? data : x) : [...prev, data]).sort((a, b) => a.nom.localeCompare(b.nom)))
    setEdition(null)
  }
  const supprimer = async (e) => {
    if (!window.confirm(`Retirer ${e.nom} de l'encadrement ? Ses tâches et son matériel resteront, sans responsable.`)) return
    const { error } = await supabase.from('stages_encadrants').delete().eq('id', e.id)
    if (error) return setErreur(error.message)
    setEncadrants(prev => prev.filter(x => x.id !== e.id))
    // Même effet que le trigger côté base : il disparaît des tâches.
    setTaches(prev => prev.map(t => ({ ...t, encadrant_ids: (t.encadrant_ids || []).filter(id => id !== e.id) })))
  }

  return (
    <Bloc st={st} colors={colors} titre="Encadrants et responsabilités" aide="Toutes les personnes qui encadrent le stage, avec leur rôle (responsable de groupe, transport, infirmerie…).">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
        {encadrants.map(e => (
          <div key={e.id} style={{ background: colors.background.raised, borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ fontWeight: 700, fontSize: '13px', color: colors.text.primary }}>{e.nom}</div>
            <div style={{ fontSize: '12px', color: colors.text.dim }}>{e.role || 'Rôle non précisé'}{e.telephone ? ` · ${e.telephone}` : ''}</div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <button onClick={() => setEdition({ ...e, role: e.role || '', telephone: e.telephone || '' })} style={petit(st)}>Modifier</button>
              <button onClick={() => supprimer(e)} style={petit(st, { color: '#f87171' })}>Retirer</button>
            </div>
          </div>
        ))}
      </div>
      {edition ? (
        <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', alignItems: 'end' }}>
          <div><label style={st.label}>Nom *</label><input value={edition.nom} onChange={e => setEdition(p => ({ ...p, nom: e.target.value }))} style={st.input} /></div>
          <div><label style={st.label}>Responsabilité</label><input value={edition.role} onChange={e => setEdition(p => ({ ...p, role: e.target.value }))} style={st.input} placeholder="Responsable U8" /></div>
          <div><label style={st.label}>Téléphone</label><input value={edition.telephone} onChange={e => setEdition(p => ({ ...p, telephone: e.target.value }))} style={st.input} /></div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={enregistrer} style={st.boutonPlein}>Enregistrer</button>
            <button onClick={() => setEdition(null)} style={st.boutonDiscret}>Annuler</button>
          </div>
        </div>
      ) : <button onClick={() => setEdition({ nom: '', role: '', telephone: '' })} style={{ ...st.bouton, marginTop: '12px' }}>+ Ajouter un encadrant</button>}
    </Bloc>
  )
}

function Materiel({ st, colors, accent, stage, encadrants, materiel, setMateriel, setErreur }) {
  const [edition, setEdition] = useState(null)
  const nomEncadrant = (id) => encadrants.find(e => e.id === id)?.nom

  const enregistrer = async () => {
    const quantite = parseInt(edition.quantite, 10)
    if (!edition.nom.trim()) return setErreur('Indique le matériel.')
    if (!(quantite > 0)) return setErreur('La quantité doit être supérieure à 0.')
    const valeurs = { nom: edition.nom.trim(), quantite, encadrant_id: edition.encadrant_id || null, source: edition.source.trim() || null, notes: edition.notes.trim() || null }
    const { data, error } = edition.id
      ? await supabase.from('stages_materiel').update(valeurs).eq('id', edition.id).select().single()
      : await supabase.from('stages_materiel').insert({ ...valeurs, stage_id: stage.id }).select().single()
    if (error) return setErreur('Enregistrement impossible : ' + error.message)
    setErreur('')
    setMateriel(prev => edition.id ? prev.map(x => x.id === data.id ? data : x) : [...prev, data])
    setEdition(null)
  }
  const changerStatut = async (m) => {
    const { data, error } = await supabase.from('stages_materiel').update({ statut: SUIVANT_MATERIEL[m.statut] }).eq('id', m.id).select().single()
    if (error) return setErreur(error.message)
    setMateriel(prev => prev.map(x => x.id === data.id ? data : x))
  }
  const supprimer = async (m) => {
    if (!window.confirm(`Supprimer « ${m.nom} » de la liste ?`)) return
    const { error } = await supabase.from('stages_materiel').delete().eq('id', m.id)
    if (error) return setErreur(error.message)
    setMateriel(prev => prev.filter(x => x.id !== m.id))
  }

  const obtenus = materiel.filter(m => m.statut === 'obtenu').length
  const couleurStatut = { a_trouver: '#f87171', demande: '#facc15', obtenu: accent }

  return (
    <Bloc st={st} colors={colors} titre="Matériel nécessaire" aide="Clique sur le statut pour le faire avancer : à trouver, demandé, obtenu."
      droite={materiel.length > 0 && <span style={{ fontSize: '13px', color: colors.text.dim }}>{obtenus}/{materiel.length} obtenus</span>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {materiel.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: colors.background.raised, borderRadius: '10px', padding: '9px 12px', flexWrap: 'wrap' }}>
            <button onClick={() => changerStatut(m)} title="Changer le statut" style={{ minWidth: '86px', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', background: 'transparent', border: `1px solid ${couleurStatut[m.statut]}80`, color: couleurStatut[m.statut] }}>{STATUTS_MATERIEL[m.statut]}</button>
            <div style={{ flex: 1, minWidth: '160px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: colors.text.primary }}>{m.quantite} × {m.nom}</div>
              <div style={{ fontSize: '12px', color: colors.text.dim }}>{[nomEncadrant(m.encadrant_id) && `Resp. ${nomEncadrant(m.encadrant_id)}`, m.source, m.notes].filter(Boolean).join(' · ') || 'Aucun détail'}</div>
            </div>
            <button onClick={() => setEdition({ ...m, encadrant_id: m.encadrant_id || '', source: m.source || '', notes: m.notes || '' })} style={petit(st)}>Modifier</button>
            <button onClick={() => supprimer(m)} style={petit(st, { color: '#f87171' })}>Supprimer</button>
          </div>
        ))}
      </div>
      {edition ? (
        <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', alignItems: 'end' }}>
          <div><label style={st.label}>Matériel *</label><input value={edition.nom} onChange={e => setEdition(p => ({ ...p, nom: e.target.value }))} style={st.input} placeholder="Ballons taille 4" /></div>
          <div><label style={st.label}>Quantité</label><input type="number" min="1" value={edition.quantite} onChange={e => setEdition(p => ({ ...p, quantite: e.target.value }))} style={st.input} /></div>
          <div>
            <label style={st.label}>Responsable</label>
            <select value={edition.encadrant_id} onChange={e => setEdition(p => ({ ...p, encadrant_id: e.target.value }))} style={st.input}>
              <option value="">—</option>
              {encadrants.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
          </div>
          <div><label style={st.label}>Où le trouver</label><input value={edition.source} onChange={e => setEdition(p => ({ ...p, source: e.target.value }))} style={st.input} placeholder="Local du club, prêt mairie…" /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={st.label}>Notes</label><input value={edition.notes} onChange={e => setEdition(p => ({ ...p, notes: e.target.value }))} style={st.input} /></div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px' }}>
            <button onClick={enregistrer} style={st.boutonPlein}>Enregistrer</button>
            <button onClick={() => setEdition(null)} style={st.boutonDiscret}>Annuler</button>
          </div>
        </div>
      ) : <button onClick={() => setEdition({ nom: '', quantite: 1, encadrant_id: '', source: '', notes: '' })} style={{ ...st.bouton, marginTop: '12px' }}>+ Ajouter du matériel</button>}
    </Bloc>
  )
}

function Taches({ st, colors, accent, stage, encadrants, taches, setTaches, creneaux, setCreneaux, setErreur }) {
  const [edition, setEdition] = useState(null)
  const [dupliSource, setDupliSource] = useState(null)
  const [messageDupli, setMessageDupli] = useState('')
  const jours = joursDuStage(stage)
  const attribution = (t) => t.tous_encadrants ? 'Tous les encadrants'
    : (t.encadrant_ids || []).map(id => encadrants.find(e => e.id === id)?.nom).filter(Boolean).join(', ') || 'Non attribuée'
  const basculerEncadrant = (id) => setEdition(p => ({ ...p, encadrant_ids: p.encadrant_ids.includes(id) ? p.encadrant_ids.filter(x => x !== id) : [...p.encadrant_ids, id] }))

  const enregistrer = async () => {
    if (!edition.tache.trim()) return setErreur('Décris la tâche.')
    const valeurs = {
      tache: edition.tache.trim(), categorie: edition.categorie, date: edition.date || null,
      heure_debut: edition.heure_debut || null, heure_fin: edition.heure_fin || null,
      encadrant_id: null, notes: edition.notes.trim() || null,
      tous_encadrants: edition.tous_encadrants, encadrant_ids: edition.tous_encadrants ? [] : edition.encadrant_ids,
    }
    const { data, error } = edition.id
      ? await supabase.from('stages_taches').update(valeurs).eq('id', edition.id).select().single()
      : await supabase.from('stages_taches').insert({ ...valeurs, stage_id: stage.id }).select().single()
    if (error) return setErreur('Enregistrement impossible : ' + error.message)
    setErreur('')
    setTaches(prev => (edition.id ? prev.map(x => x.id === data.id ? data : x) : [...prev, data])
      .sort((a, b) => `${a.date || '9'}${a.heure_debut || ''}`.localeCompare(`${b.date || '9'}${b.heure_debut || ''}`)))
    setEdition(null)
  }
  const changerStatut = async (t) => {
    const { data, error } = await supabase.from('stages_taches').update({ statut: SUIVANT_TACHE[t.statut] }).eq('id', t.id).select().single()
    if (error) return setErreur(error.message)
    setTaches(prev => prev.map(x => x.id === data.id ? data : x))
  }
  const supprimer = async (t) => {
    if (!window.confirm('Supprimer cette tâche ?')) return
    const { error } = await supabase.from('stages_taches').delete().eq('id', t.id)
    if (error) return setErreur(error.message)
    setTaches(prev => prev.filter(x => x.id !== t.id))
  }

  const faites = taches.filter(t => t.statut === 'fait').length
  const couleurStatut = { a_faire: colors.text.faint, en_cours: '#facc15', fait: accent }

  return (
    <Bloc st={st} colors={colors} titre="Tâches" aide="Transport, surveillance, repas, logistique… Attribue chaque tâche à un encadrant ; clique sur le statut pour le faire avancer."
      droite={taches.length > 0 && <span style={{ fontSize: '13px', color: colors.text.dim }}>{faites}/{taches.length} faites</span>}>
      {!dupliSource && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
          {jours.length > 1 && <button onClick={() => { setMessageDupli(''); setDupliSource(taches.find(t => t.date)?.date || jours[0]) }} style={st.bouton}>Dupliquer une journée</button>}
          <BoutonDoublons st={st} stage={stage} creneaux={creneaux} taches={taches} setCreneaux={setCreneaux} setTaches={setTaches} onMessage={setMessageDupli} />
          <span style={{ fontSize: '12px', color: colors.text.faint }}>Recopie les tâches (et si besoin les créneaux du programme) d'un jour vers les autres.</span>
        </div>
      )}
      {messageDupli && <p style={{ margin: '0 0 10px', fontSize: '13px', color: messageDupli.startsWith('Suppression impossible') ? '#f87171' : '#4ade80' }}>{messageDupli}</p>}
      {dupliSource && (
        <DuplicationJournee st={st} colors={colors} stage={stage} jours={jours} sourceInitiale={dupliSource}
          creneaux={creneaux} taches={taches} setCreneaux={setCreneaux} setTaches={setTaches}
          onFermer={(msg) => { setDupliSource(null); setMessageDupli(msg) }} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {taches.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: colors.background.raised, borderRadius: '10px', padding: '9px 12px', flexWrap: 'wrap' }}>
            <button onClick={() => changerStatut(t)} title="Changer le statut" style={{ minWidth: '74px', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', background: 'transparent', border: `1px solid ${couleurStatut[t.statut]}80`, color: couleurStatut[t.statut] }}>{STATUTS_TACHE[t.statut]}</button>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: colors.text.primary, textDecoration: t.statut === 'fait' ? 'line-through' : 'none' }}>{t.tache}</div>
              <div style={{ fontSize: '12px', color: colors.text.dim, textTransform: 'none' }}>
                {[CATEGORIES_TACHE[t.categorie] || t.categorie, t.date ? formatJourCourt(t.date) : 'Tous les jours', t.heure_debut && `${heure(t.heure_debut)}${t.heure_fin ? `–${heure(t.heure_fin)}` : ''}`, attribution(t)].filter(Boolean).join(' · ')}
              </div>
            </div>
            <button onClick={() => setEdition({ ...t, date: t.date || '', heure_debut: heure(t.heure_debut), heure_fin: heure(t.heure_fin), encadrant_ids: t.encadrant_ids || [], tous_encadrants: !!t.tous_encadrants, notes: t.notes || '' })} style={petit(st)}>Modifier</button>
            <button onClick={() => supprimer(t)} style={petit(st, { color: '#f87171' })}>Supprimer</button>
          </div>
        ))}
      </div>
      {edition ? (
        <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', alignItems: 'end' }}>
          <div style={{ gridColumn: '1 / -1' }}><label style={st.label}>Tâche *</label><input value={edition.tache} onChange={e => setEdition(p => ({ ...p, tache: e.target.value }))} style={st.input} placeholder="Conduire le minibus vers Coubertin" /></div>
          <div>
            <label style={st.label}>Catégorie</label>
            <select value={edition.categorie} onChange={e => setEdition(p => ({ ...p, categorie: e.target.value }))} style={st.input}>
              {Object.entries(CATEGORIES_TACHE).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </div>
          <div>
            <label style={st.label}>Jour</label>
            <select value={edition.date} onChange={e => setEdition(p => ({ ...p, date: e.target.value }))} style={st.input}>
              <option value="">Tous les jours du stage</option>
              {jours.map(j => <option key={j} value={j}>{formatJourCourt(j)}</option>)}
            </select>
          </div>
          <div><label style={st.label}>Début</label><input type="time" value={edition.heure_debut} onChange={e => setEdition(p => ({ ...p, heure_debut: e.target.value }))} style={st.input} /></div>
          <div><label style={st.label}>Fin</label><input type="time" value={edition.heure_fin} onChange={e => setEdition(p => ({ ...p, heure_fin: e.target.value }))} style={st.input} /></div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={st.label}>Encadrants</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setEdition(p => ({ ...p, tous_encadrants: !p.tous_encadrants }))} style={{
                padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                background: edition.tous_encadrants ? accent + '20' : 'transparent', border: `1px solid ${edition.tous_encadrants ? accent : colors.border.default}`, color: edition.tous_encadrants ? accent : colors.text.dim,
              }}>Tous les encadrants</button>
              {!edition.tous_encadrants && encadrants.map(e => {
                const actif = edition.encadrant_ids.includes(e.id)
                return (
                  <button key={e.id} type="button" onClick={() => basculerEncadrant(e.id)} style={{
                    padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    background: actif ? accent + '20' : 'transparent', border: `1px solid ${actif ? accent : colors.border.default}`, color: actif ? accent : colors.text.dim,
                  }}>{e.nom}</button>
                )
              })}
            </div>
            {encadrants.length === 0 && <p style={{ margin: '6px 0 0', fontSize: '12px', color: colors.text.faint }}>Ajoute d'abord des encadrants pour leur attribuer la tâche.</p>}
          </div>
          <div style={{ gridColumn: '1 / -1' }}><label style={st.label}>Notes</label><input value={edition.notes} onChange={e => setEdition(p => ({ ...p, notes: e.target.value }))} style={st.input} /></div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px' }}>
            <button onClick={enregistrer} style={st.boutonPlein}>Enregistrer</button>
            <button onClick={() => setEdition(null)} style={st.boutonDiscret}>Annuler</button>
          </div>
        </div>
      ) : <button onClick={() => setEdition({ tache: '', categorie: 'general', date: '', heure_debut: '', heure_fin: '', encadrant_ids: [], tous_encadrants: false, notes: '' })} style={{ ...st.bouton, marginTop: '12px' }}>+ Ajouter une tâche</button>}
    </Bloc>
  )
}

function PlanningEncadrant({ st, colors, accent, stage, encadrants, taches, creneaux, clubNom, setErreur }) {
  const [choisi, setChoisi] = useState('')
  const encadrant = encadrants.find(e => e.id === choisi) || encadrants[0]
  if (encadrants.length === 0) {
    return <Bloc st={st} colors={colors} titre="Planning de chaque encadrant" aide="Ajoute des encadrants pour voir leur planning individuel." />
  }

  const elements = elementsPlanningEncadrant(encadrant, taches, creneaux, joursDuStage(stage))
  const exporter = async (liste) => {
    try { await telechargerPlanningEncadrants({ stage, clubNom, encadrants: liste, taches, creneaux }) }
    catch (e) { setErreur('Export PDF impossible : ' + e.message) }
  }
  const parJour = elements.reduce((acc, e) => { const k = e.date || 'tout'; (acc[k] = acc[k] || []).push(e); return acc }, {})

  return (
    <Bloc st={st} colors={colors} titre="Planning de chaque encadrant" aide="Ses tâches et les créneaux du programme où il est indiqué responsable (champ « Responsable » du planning).">
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {encadrants.map(e => (
          <button key={e.id} onClick={() => setChoisi(e.id)} style={{
            padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            background: encadrant.id === e.id ? accent + '18' : 'transparent', border: `1px solid ${encadrant.id === e.id ? accent + '60' : colors.border.default}`, color: encadrant.id === e.id ? accent : colors.text.dim,
          }}>{e.nom}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <button onClick={() => exporter([encadrant])} style={st.bouton}>PDF de {encadrant.nom}</button>
        <button onClick={() => exporter(encadrants)} style={st.boutonDiscret}>PDF de tous les encadrants</button>
      </div>
      <p style={{ margin: '0 0 10px', fontSize: '13px', color: colors.text.secondary }}><strong>{encadrant.nom}</strong>{encadrant.role ? ` · ${encadrant.role}` : ''}{encadrant.telephone ? ` · ${encadrant.telephone}` : ''}</p>
      {elements.length === 0 ? <p style={{ margin: 0, fontSize: '13px', color: colors.text.faint }}>Rien de prévu pour cet encadrant pour l'instant.</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Object.entries(parJour).map(([jour, liste]) => (
            <div key={jour}>
              <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '13px', color: colors.text.primary, textTransform: 'capitalize' }}>{jour === 'tout' ? 'Tout le stage' : formatDate(jour)}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {liste.map(e => (
                  <div key={e.cle} style={{ display: 'flex', gap: '12px', background: colors.background.raised, borderRadius: '10px', padding: '8px 12px', borderLeft: `4px solid ${e.type === 'Tâche' ? '#60a5fa' : accent}` }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: colors.text.secondary, minWidth: '86px' }}>{e.debut ? `${heure(e.debut)}${e.fin ? ` – ${heure(e.fin)}` : ''}` : 'Sans horaire'}</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: colors.text.primary }}>{e.titre} <span style={{ fontWeight: 400, fontSize: '11px', color: colors.text.faint }}>· {e.type}</span></div>
                      {e.detail && <div style={{ fontSize: '12px', color: colors.text.dim }}>{e.detail}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Bloc>
  )
}
