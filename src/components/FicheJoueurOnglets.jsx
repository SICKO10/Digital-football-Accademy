// Fiche joueur en onglets (bloc 7 de PLAN-fiches-evaluation.md) : Évaluation, Tests, Notes, Historique.
// L'onglet Évaluation reprend la fiche du bloc 6 (FicheEvaluationNouvelle en mode intégré).
// Tables : evaluations, evaluation_resultats, notes_suivi, criteres_evaluation, evaluations_joueur (anciennes fiches),
// tests_physiques (tests déjà saisis dans la préparation physique, jamais modifiés ici).
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { labelCategorie } from '../lib/categories'
import { PERIODES, ASPECTS } from '../constants/evaluation'
import FicheEvaluationNouvelle from './FicheEvaluationNouvelle'
import BoutonImprimerEvaluation from './ImprimerEvaluation'

const LIBELLE_POSTE = { gardien: 'Gardien', defenseur: 'Défenseur', milieu: 'Milieu', attaquant: 'Attaquant' }
const ORDRE_PILIERS = ['Tactique', 'Technique', 'Physique', 'Mental']
const COULEUR_PILIER = { Tactique: '#f59e0b', Technique: '#3b82f6', Physique: '#4ade80', Mental: '#a78bfa' }
const TESTS_ANCIENS = [
  { key: 'cmj_cm', label: 'CMJ', unite: 'cm', sens: 'plus_haut' },
  { key: 'sprint_10m_s', label: 'Sprint 10 m', unite: 's', sens: 'plus_bas' },
  { key: 'sprint_30m_s', label: 'Sprint 30 m', unite: 's', sens: 'plus_bas' },
  { key: 'test_30_15_kmh', label: '30-15 IFT', unite: 'km/h', sens: 'plus_haut' },
]

const fr1 = (x) => (x == null ? '' : (Math.round(x * 10) / 10).toString().replace('.', ','))
const dateCourte = (d) => (d ? new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
const initiales = (nom) => (nom || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(m => m[0].toUpperCase()).join('')

// Courbe simple en SVG : points { x: date, y: valeur }, objectif facultatif.
function Courbe({ points, objectif, unite, couleur, colors }) {
  if (points.length === 0) return null
  const W = 320, H = 110, PX = 34, PY = 14
  const ys = points.map(p => p.y).concat(objectif != null ? [objectif] : [])
  let min = Math.min(...ys), max = Math.max(...ys)
  if (min === max) { min -= 1; max += 1 }
  const marge = (max - min) * 0.15
  min -= marge; max += marge
  const px = (i) => (points.length === 1 ? W / 2 : PX + (i * (W - PX - 10)) / (points.length - 1))
  const py = (y) => H - PY - ((y - min) / (max - min)) * (H - 2 * PY)
  const chemin = points.map((p, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${py(p.y).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 360, display: 'block' }} role="img"
      aria-label={`Courbe : ${points.map(p => `${p.libelle} ${fr1(p.y)} ${unite || ''}`).join(', ')}`}>
      {objectif != null && (
        <g>
          <line x1={PX} x2={W - 6} y1={py(objectif)} y2={py(objectif)} stroke={colors.text.faint} strokeDasharray="4 3" strokeWidth="1" />
          <text x={W - 6} y={py(objectif) - 3} textAnchor="end" fontSize="9" fill={colors.text.faint}>objectif {fr1(objectif)}</text>
        </g>
      )}
      <path d={chemin} fill="none" stroke={couleur} strokeWidth="2" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={px(i)} cy={py(p.y)} r="3.5" fill={couleur} />
          <text x={px(i)} y={py(p.y) - 7} textAnchor="middle" fontSize="9" fontWeight="700" fill={colors.text.secondary}>{fr1(p.y)}</text>
          <text x={px(i)} y={H - 2} textAnchor="middle" fontSize="8" fill={colors.text.faint}>{p.libelle}</text>
        </g>
      ))}
    </svg>
  )
}

export default function FicheJoueurOnglets({ equipeJoueurId, joueurNom, poste, categorieCle, modele, version, criteres, params, educateurId, readOnly = false, onClose, onOuvrirAncienne }) {
  const colors = useColors()
  const [onglet, setOnglet] = useState('evaluation')
  const [monId, setMonId] = useState(educateurId || null)
  const [ligne, setLigne] = useState(null) // ligne d'effectif : photo, joueur_id
  const [pastilleVisible, setPastilleVisible] = useState(false)

  useEffect(() => {
    let annule = false
    ;(async () => {
      if (!educateurId) { const { data } = await supabase.auth.getUser(); if (!annule) setMonId(data?.user?.id || null) }
      const { data: l } = await supabase.from('equipe_joueurs').select('id, joueur_id, poste, numero').eq('id', equipeJoueurId).maybeSingle()
      if (!annule) setLigne(l || null)
    })()
    return () => { annule = true }
  }, [equipeJoueurId, educateurId])

  const cartePasti = { fontSize: 10, fontWeight: 800, textTransform: 'uppercase', borderRadius: 999, padding: '3px 8px' }
  const ONGLETS = [['evaluation', 'Évaluation'], ['tests', 'Tests'], ['notes', 'Notes'], ['historique', 'Historique']]

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-label={`Fiche de ${joueurNom || 'joueur'}`}
        style={{ background: colors.background.sunken, border: `1px solid ${colors.border.default}`, borderRadius: 16, padding: 20, width: '100%', maxWidth: 820, maxHeight: '92vh', overflowY: 'auto', boxSizing: 'border-box' }}>
        {/* En-tête */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
          <div aria-hidden="true" style={{ width: 46, height: 46, borderRadius: '50%', background: colors.accent.blue + '25', color: colors.accent.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
            {initiales(joueurNom)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3 style={{ color: colors.text.primary, margin: '0 0 3px', fontSize: 17, fontWeight: 800 }}>{joueurNom || 'Joueur'}</h3>
            <p style={{ color: colors.text.faint, fontSize: 12, margin: 0 }}>
              {[categorieCle ? labelCategorie(categorieCle) : null, poste ? LIBELLE_POSTE[poste] : null, ligne?.numero ? `n° ${ligne.numero}` : null, `${modele.nom} (version ${version.numero})`].filter(Boolean).join(' · ')}
            </p>
          </div>
          {<BoutonImprimerEvaluation mode="joueur" educateurId={educateurId} equipeJoueurId={equipeJoueurId} joueurNom={joueurNom} poste={poste} numero={ligne?.numero}
            cadre={{ modele, version, criteres, params, categorieCle }} libelle="Imprimer" style={{ padding: '6px 10px', fontSize: 12, minHeight: 36 }} />}
          {onOuvrirAncienne && <button onClick={onOuvrirAncienne} style={{ background: 'none', border: `1px solid ${colors.border.default}`, color: colors.text.secondary, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', minHeight: 36 }}>Ancienne fiche</button>}
          {pastilleVisible && <span style={{ ...cartePasti, color: colors.accent.green, border: `1px solid ${colors.accent.green}` }}>Visible par le joueur</span>}
          <button onClick={onClose} aria-label="Fermer" style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: 24, cursor: 'pointer', lineHeight: 1, minWidth: 36, minHeight: 36 }}>×</button>
        </div>

        <div role="tablist" style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${colors.border.subtle}`, marginBottom: 14, overflowX: 'auto' }}>
          {ONGLETS.map(([cle, label]) => (
            <button key={cle} role="tab" aria-selected={onglet === cle} onClick={() => setOnglet(cle)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'Barlow, sans-serif', minHeight: 40,
                color: onglet === cle ? colors.accent.blue : colors.text.faint,
                borderBottom: onglet === cle ? `2px solid ${colors.accent.blue}` : '2px solid transparent' }}>
              {label}
            </button>
          ))}
        </div>

        {/* L'onglet Évaluation reste monté pour ne pas perdre une saisie en cours */}
        <div style={{ display: onglet === 'evaluation' ? 'block' : 'none' }}>
          <FicheEvaluationNouvelle integre equipeJoueurId={equipeJoueurId} joueurNom={joueurNom} poste={poste} categorieCle={categorieCle}
            modele={modele} version={version} criteres={criteres} params={params} readOnly={readOnly} onClose={onClose}
            onVisibiliteChange={setPastilleVisible} />
        </div>
        {onglet === 'tests' && <OngletTests colors={colors} equipeJoueurId={equipeJoueurId} joueurId={ligne?.joueur_id} educateurId={monId} criteres={criteres} />}
        {onglet === 'notes' && <OngletNotes colors={colors} equipeJoueurId={equipeJoueurId} monId={monId} readOnly={readOnly} />}
        {onglet === 'historique' && <OngletHistorique colors={colors} equipeJoueurId={equipeJoueurId} monId={monId} />}
      </div>
    </div>
  )
}

// ── Tests : une courbe par test, objectif du modèle, tests déjà saisis en préparation physique ──
function OngletTests({ colors, equipeJoueurId, joueurId, educateurId, criteres }) {
  const [donnees, setDonnees] = useState(null)
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    let annule = false
    ;(async () => {
      try {
        const { data: evs, error } = await supabase.from('evaluations').select('id, date_evaluation, statut, version_id, nature, numero, saison')
          .eq('equipe_joueur_id', equipeJoueurId).order('date_evaluation', { ascending: true })
        if (error) throw error
        const ids = (evs || []).map(e => e.id)
        let res = []
        let crs = []
        if (ids.length) {
          const vIds = [...new Set(evs.map(e => e.version_id))]
          const [r, c] = await Promise.all([
            supabase.from('evaluation_resultats').select('evaluation_id, critere_id, valeur, source').in('evaluation_id', ids).eq('source', 'educateur').not('valeur', 'is', null),
            supabase.from('criteres_evaluation').select('id, libelle, unite, sens, type, bibliotheque_critere_id').in('version_id', vIds).eq('type', 'test'),
          ])
          if (r.error) throw r.error
          if (c.error) throw c.error
          res = r.data || []; crs = c.data || []
        }
        let anciens = []
        if (joueurId) {
          const { data: ts } = await supabase.from('tests_physiques').select('*').eq('joueur_id', joueurId).order('date_test', { ascending: true })
          anciens = ts || []
        }
        if (!annule) setDonnees({ evs: evs || [], res, crs, anciens })
      } catch (e) { console.error('[OngletTests]', e); if (!annule) setErreur(true) }
    })()
    return () => { annule = true }
  }, [equipeJoueurId, joueurId, educateurId])

  const series = useMemo(() => {
    if (!donnees) return []
    const parNom = new Map()
    donnees.res.forEach(r => {
      const c = donnees.crs.find(x => x.id === r.critere_id)
      const e = donnees.evs.find(x => x.id === r.evaluation_id)
      if (!c || !e) return
      const cle = c.libelle.trim().toLowerCase()
      if (!parNom.has(cle)) parNom.set(cle, { libelle: c.libelle, unite: c.unite, sens: c.sens, points: [] })
      parNom.get(cle).points.push({ date: e.date_evaluation, y: Number(r.valeur), libelle: dateCourte(e.date_evaluation).replace(/ \d{4}$/, '') })
    })
    const objectifs = {}
    criteres.filter(c => c.type === 'test' && c.objectif != null).forEach(c => { objectifs[c.libelle.trim().toLowerCase()] = Number(c.objectif) })
    return [...parNom.entries()].map(([cle, s]) => ({ ...s, objectif: objectifs[cle] ?? null, points: s.points.sort((a, b) => a.date.localeCompare(b.date)) }))
  }, [donnees, criteres])

  const anciensSeries = useMemo(() => {
    if (!donnees) return []
    return TESTS_ANCIENS.map(m => ({
      ...m,
      points: donnees.anciens.filter(t => t[m.key] != null).map(t => ({ date: t.date_test, y: Number(t[m.key]), libelle: dateCourte(t.date_test).replace(/ \d{4}$/, '') })),
    })).filter(m => m.points.length)
  }, [donnees])

  if (erreur) return <p role="alert" style={{ color: colors.accent.red, fontSize: 13 }}>Impossible de charger les tests. Réessaie dans un instant.</p>
  if (!donnees) return <p style={{ color: colors.text.faint, fontSize: 13 }}>Chargement…</p>

  const bloc = (s, i, couleur) => {
    const p = s.points
    const dernier = p[p.length - 1], precedent = p.length > 1 ? p[p.length - 2] : null
    const delta = precedent ? dernier.y - precedent.y : null
    const bon = delta == null ? null : (s.sens === 'plus_bas' ? delta < 0 : delta > 0)
    return (
      <section key={s.libelle + i} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 12, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          <strong style={{ color: colors.text.primary, fontSize: 13 }}>{s.libelle}</strong>
          <span style={{ fontSize: 12, color: colors.text.secondary }}>
            Dernier : <strong>{fr1(dernier.y)} {s.unite}</strong>
            {precedent && <span style={{ color: colors.text.faint }}> · avant : {fr1(precedent.y)}</span>}
            {delta != null && Math.abs(delta) > 0.0001 && <span style={{ marginLeft: 6, fontWeight: 800, color: bon ? colors.accent.green : colors.accent.red }}>{delta > 0 ? '▲ +' : '▼ −'}{fr1(Math.abs(delta))}</span>}
            {s.objectif != null && <span style={{ color: colors.text.faint }}> · objectif : {fr1(s.objectif)} {s.unite}</span>}
          </span>
        </div>
        <Courbe points={p} objectif={s.objectif} unite={s.unite} couleur={couleur} colors={colors} />
      </section>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {series.length === 0 && anciensSeries.length === 0 && (
        <p style={{ color: colors.text.faint, fontSize: 13, margin: 0 }}>Aucun test chiffré pour ce joueur. Remplis les tests dans l'onglet Évaluation : une courbe apparaît dès la première mesure.</p>
      )}
      {series.map((s, i) => bloc(s, i, colors.accent.blue))}
      {anciensSeries.length > 0 && (
        <>
          <h4 style={{ margin: '8px 0 0', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: colors.text.secondary }}>Tests de préparation physique</h4>
          <p style={{ margin: 0, fontSize: 11, color: colors.text.faint }}>Mesures déjà saisies dans la préparation physique, affichées ici en lecture seule.</p>
          {anciensSeries.map((s, i) => bloc({ libelle: s.label, unite: s.unite, sens: s.sens, points: s.points, objectif: null }, 'a' + i, COULEUR_PILIER.Physique))}
        </>
      )}
    </div>
  )
}

// ── Notes : observations datées, visibilité privée ou staff, transmissible ──
function OngletNotes({ colors, equipeJoueurId, monId, readOnly }) {
  const [notes, setNotes] = useState(null)
  const [erreur, setErreur] = useState('')
  const [texte, setTexte] = useState('')
  const [visibilite, setVisibilite] = useState('privee')
  const [transmissible, setTransmissible] = useState(false)
  const [envoi, setEnvoi] = useState(false)

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from('notes_suivi').select('*').eq('equipe_joueur_id', equipeJoueurId).order('date_note', { ascending: false }).order('created_at', { ascending: false })
    if (error) { setErreur('Impossible de charger les notes.'); setNotes([]); return }
    setNotes(data || [])
  }, [equipeJoueurId])
  useEffect(() => { charger() }, [charger])

  const ajouter = async () => {
    if (!texte.trim()) return
    setEnvoi(true); setErreur('')
    const { error } = await supabase.from('notes_suivi').insert({ equipe_joueur_id: equipeJoueurId, texte: texte.trim(), visibilite, transmissible: visibilite === 'staff' && transmissible })
    setEnvoi(false)
    if (error) { console.error('[OngletNotes]', error); setErreur("La note n'a pas pu être enregistrée."); return }
    setTexte(''); setVisibilite('privee'); setTransmissible(false)
    charger()
  }
  const changer = async (n, champs) => {
    const { error } = await supabase.from('notes_suivi').update(champs).eq('id', n.id)
    if (error) { setErreur('Modification impossible.'); return }
    charger()
  }
  const supprimer = async (n) => {
    if (!window.confirm('Supprimer cette note ?')) return
    const { error } = await supabase.from('notes_suivi').delete().eq('id', n.id)
    if (error) { setErreur('Suppression impossible.'); return }
    charger()
  }

  const champ = { background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: 8, color: colors.text.primary, fontSize: 13, fontFamily: 'Barlow, sans-serif', boxSizing: 'border-box' }
  const lien = { background: 'none', border: 'none', color: colors.accent.blue, cursor: 'pointer', fontWeight: 700, padding: 0, fontSize: 11 }

  return (
    <div>
      <p style={{ color: colors.text.faint, fontSize: 12, margin: '0 0 12px' }}>
        Tes observations, comptes rendus d'entretien, comportement. Le joueur et ses parents ne voient jamais ces notes dans leur espace.
      </p>
      <p style={{ color: colors.text.secondary, fontSize: 12, margin: '0 0 12px', lineHeight: 1.5 }}>
        <strong>Ce qui n'a pas sa place ici :</strong> santé (blessures, douleurs, traitements, moral), vie familiale ou privée, origine, religion, opinions, jugements sur la personne. Écrivez seulement des observations de terrain, factuelles et respectueuses. Le joueur peut en obtenir une copie s'il demande l'accès à ses données.
      </p>
      {!readOnly && (
        <section style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <textarea rows={3} maxLength={5000} value={texte} onChange={e => setTexte(e.target.value)} placeholder="Nouvelle note…" aria-label="Nouvelle note" style={{ ...champ, width: '100%', resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
            <label style={{ fontSize: 12, color: colors.text.secondary }}>
              Visible par{' '}
              <select value={visibilite} onChange={e => { setVisibilite(e.target.value); if (e.target.value === 'privee') setTransmissible(false) }} style={{ ...champ, padding: '6px 8px' }}>
                <option value="privee">Moi seul</option>
                <option value="staff">Le staff du club</option>
              </select>
            </label>
            {visibilite === 'staff' && (
              <label style={{ fontSize: 12, color: colors.text.secondary, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <input type="checkbox" checked={transmissible} onChange={e => setTransmissible(e.target.checked)} />
                Transmissible au prochain éducateur
              </label>
            )}
            <button type="button" disabled={envoi || !texte.trim()} onClick={ajouter}
              style={{ marginLeft: 'auto', background: colors.accent.blue, color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 800, fontSize: 12, cursor: texte.trim() ? 'pointer' : 'default', opacity: texte.trim() ? 1 : 0.5 }}>
              Ajouter la note
            </button>
          </div>
        </section>
      )}
      {erreur && <p role="alert" style={{ color: colors.accent.red, fontSize: 12, margin: '0 0 10px' }}>{erreur}</p>}
      {!notes ? <p style={{ color: colors.text.faint, fontSize: 13 }}>Chargement…</p>
        : notes.length === 0 ? <p style={{ color: colors.text.faint, fontSize: 13 }}>Aucune note pour ce joueur.</p>
        : notes.map(n => {
          const miennes = n.auteur_id === monId
          return (
            <div key={n.id} style={{ padding: '10px 0', borderTop: `1px solid ${colors.border.subtle}` }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: colors.text.secondary }}>{dateCourte(n.date_note)}</span>
                <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: n.visibilite === 'staff' ? colors.accent.blue : colors.text.faint }}>{n.visibilite === 'staff' ? 'Staff' : 'Privée'}</span>
                {n.transmissible && <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: colors.accent.green }}>Transmissible</span>}
                {!miennes && <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: colors.text.faint }}>Écrite par un autre membre du staff</span>}
              </div>
              <p style={{ margin: '0 0 6px', fontSize: 13, color: colors.text.primary, whiteSpace: 'pre-wrap' }}>{n.texte}</p>
              {miennes && !readOnly && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" style={lien} onClick={() => changer(n, n.visibilite === 'privee' ? { visibilite: 'staff' } : { visibilite: 'privee', transmissible: false })}>
                    {n.visibilite === 'privee' ? 'Partager avec le staff' : 'Rendre privée'}
                  </button>
                  {n.visibilite === 'staff' && (
                    <button type="button" style={lien} onClick={() => changer(n, { transmissible: !n.transmissible })}>
                      {n.transmissible ? 'Ne plus transmettre' : 'Transmettre'}
                    </button>
                  )}
                  <button type="button" style={{ ...lien, color: colors.accent.red }} onClick={() => supprimer(n)}>Supprimer</button>
                </div>
              )}
            </div>
          )
        })}
    </div>
  )
}

// ── Historique : toutes les évaluations saison par saison, notes transmises, anciennes fiches ──
function OngletHistorique({ colors, equipeJoueurId, monId }) {
  const [d, setD] = useState(null)
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    let annule = false
    ;(async () => {
      try {
        const [evs, anciennes, notes] = await Promise.all([
          supabase.from('evaluations').select('*').eq('equipe_joueur_id', equipeJoueurId).order('date_evaluation', { ascending: false }),
          supabase.from('evaluations_joueur').select('*').eq('equipe_joueur_id', equipeJoueurId),
          supabase.from('notes_suivi').select('*').eq('equipe_joueur_id', equipeJoueurId).eq('visibilite', 'staff').order('date_note', { ascending: false }),
        ])
        if (evs.error) throw evs.error
        if (anciennes.error) throw anciennes.error
        if (notes.error) throw notes.error
        const ids = (evs.data || []).map(e => e.id)
        let res = [], crs = []
        if (ids.length) {
          const vIds = [...new Set(evs.data.map(e => e.version_id))]
          const [r, c] = await Promise.all([
            supabase.from('evaluation_resultats').select('evaluation_id, critere_id, note').in('evaluation_id', ids).eq('source', 'educateur').not('note', 'is', null),
            supabase.from('criteres_evaluation').select('id, pilier').in('version_id', vIds).eq('type', 'note'),
          ])
          if (r.error) throw r.error
          if (c.error) throw c.error
          res = r.data || []; crs = c.data || []
        }
        if (annule) return
        setD({ evs: evs.data || [], anciennes: anciennes.data || [], notes: notes.data || [], res, crs })
        // Journal des accès : seulement si on lit autre chose que ses propres écrits
        const autre = (evs.data || []).some(e => e.auteur_id && e.auteur_id !== monId)
          || (anciennes.data || []).some(a => a.educateur_id !== monId)
          || (notes.data || []).some(n => n.auteur_id !== monId)
        if (autre) supabase.rpc('noter_acces_evaluations', { p_equipe_joueur_id: equipeJoueurId, p_objet: 'historique' }).then(({ error }) => { if (error) console.warn('[journal]', error.message) })
      } catch (e) { console.error('[OngletHistorique]', e); if (!annule) setErreur(true) }
    })()
    return () => { annule = true }
  }, [equipeJoueurId, monId])

  const saisons = useMemo(() => {
    if (!d) return []
    const m = new Map()
    const ajout = (saison) => { if (!m.has(saison)) m.set(saison, { saison, evals: [], anciennes: [], notes: [] }); return m.get(saison) }
    d.evs.forEach(e => ajout(e.saison).evals.push(e))
    d.anciennes.forEach(a => ajout(a.saison).anciennes.push(a))
    d.notes.forEach(n => {
      // Les notes staff sont rangées par la saison de leur date (juillet à juin)
      const dt = new Date(n.date_note + 'T12:00:00'); const an = dt.getFullYear(); const debut = dt.getMonth() >= 6 ? an : an - 1
      ajout(`${debut}-${debut + 1}`).notes.push(n)
    })
    return [...m.values()].sort((a, b) => b.saison.localeCompare(a.saison))
  }, [d])

  if (erreur) return <p role="alert" style={{ color: colors.accent.red, fontSize: 13 }}>Impossible de charger l'historique. Réessaie dans un instant.</p>
  if (!d) return <p style={{ color: colors.text.faint, fontSize: 13 }}>Chargement…</p>
  if (saisons.length === 0) return <p style={{ color: colors.text.faint, fontSize: 13 }}>Aucune évaluation ni note dans l'historique de ce joueur.</p>

  const moyennes = (e) => {
    const par = {}
    d.res.filter(r => r.evaluation_id === e.id).forEach(r => {
      const c = d.crs.find(x => x.id === r.critere_id)
      if (c?.pilier) (par[c.pilier] ||= []).push(r.note)
    })
    return Object.keys(par).sort((a, b) => ORDRE_PILIERS.indexOf(a) - ORDRE_PILIERS.indexOf(b))
      .map(p => ({ pilier: p, moy: par[p].reduce((s, x) => s + x, 0) / par[p].length }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {saisons.map(s => (
        <section key={s.saison} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 12, padding: 14 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: colors.text.secondary }}>Saison {s.saison}</h4>
          {s.evals.map(e => (
            <div key={e.id} style={{ padding: '8px 0', borderTop: `1px solid ${colors.border.subtle}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.text.primary }}>
                {e.nature === 'tests' ? 'Séance de tests' : e.numero ? `Évaluation ${e.numero}` : 'Évaluation à la demande'} · {dateCourte(e.date_evaluation)}
                <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: e.statut === 'terminee' ? colors.accent.green : colors.text.faint }}>{e.statut === 'terminee' ? 'Terminée' : 'Brouillon'}</span>
              </div>
              {moyennes(e).length > 0 && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                  {moyennes(e).map(m => <span key={m.pilier} style={{ fontSize: 12, color: COULEUR_PILIER[m.pilier] || colors.text.secondary, fontWeight: 700 }}>{m.pilier} {fr1(m.moy)}/3</span>)}
                </div>
              )}
              {(e.objectif_personnel || e.objectif_collectif) && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.text.faint }}>
                  {e.objectif_personnel ? `Objectif personnel : ${e.objectif_personnel}` : ''}{e.objectif_personnel && e.objectif_collectif ? ' · ' : ''}{e.objectif_collectif ? `Objectif collectif : ${e.objectif_collectif}` : ''}
                </p>
              )}
              {e.commentaire && <p style={{ margin: '4px 0 0', fontSize: 12, color: colors.text.secondary, fontStyle: 'italic' }}>« {e.commentaire} »</p>}
            </div>
          ))}
          {s.anciennes.map(a => {
            const p = PERIODES.find(x => x.key === a.periode)
            return (
              <div key={a.id} style={{ padding: '8px 0', borderTop: `1px solid ${colors.border.subtle}` }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.text.primary }}>
                  Ancienne fiche · {p?.label || a.periode}
                  {a.note_globale_saison != null && <span style={{ marginLeft: 8, color: colors.text.secondary }}>{a.note_globale_saison}/20</span>}
                </div>
                {ASPECTS.map(x => {
                  const forts = a[`${x.key}_points_forts`], axes = a[`${x.key}_a_ameliorer`]
                  if (!forts && !axes) return null
                  return (
                    <p key={x.key} style={{ margin: '3px 0 0', fontSize: 12, color: colors.text.secondary, lineHeight: 1.5 }}>
                      <strong style={{ color: colors.text.primary }}>{x.label}</strong>{forts ? ` · Points forts : ${forts}` : ''}{axes ? ` · À améliorer : ${axes}` : ''}
                    </p>
                  )
                })}
                {(a.objectif_personnel || a.objectif_collectif) && (
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: colors.text.faint }}>
                    {a.objectif_personnel ? `Objectif personnel : ${a.objectif_personnel}` : ''}{a.objectif_personnel && a.objectif_collectif ? ' · ' : ''}{a.objectif_collectif ? `Objectif collectif : ${a.objectif_collectif}` : ''}
                  </p>
                )}
              </div>
            )
          })}
          {s.notes.map(n => (
            <div key={n.id} style={{ padding: '8px 0', borderTop: `1px solid ${colors.border.subtle}` }}>
              <div style={{ fontSize: 11, color: colors.text.faint, fontWeight: 700 }}>Note du staff · {dateCourte(n.date_note)}{n.transmissible ? ' · transmissible' : ''}</div>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: colors.text.secondary, whiteSpace: 'pre-wrap' }}>{n.texte}</p>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
