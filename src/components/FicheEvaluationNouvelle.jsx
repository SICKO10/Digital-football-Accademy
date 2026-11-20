// Nouvelle fiche d'évaluation (bloc 6 de PLAN-fiches-evaluation.md).
// Une évaluation = un joueur, une version publiée d'un modèle, un numéro dans la saison.
// Critères : note de 1 à 3, test chiffré, oui / non, commentaire. Moyenne par pilier,
// évolution par rapport à la fiche précédente, enregistrement automatique en brouillon,
// « reprendre la dernière », critères de poste filtrés selon le poste du joueur.
// Tables : evaluations, evaluation_resultats, parametres_evaluation (supabase_fiches_evaluation_bloc2.sql).
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { saisonActuelle } from '../lib/saison'
import { labelCategorie } from '../lib/categories'

const ECHELLE = [
  { v: 1, label: 'Non acquis', court: '1' },
  { v: 2, label: 'En cours', court: '2' },
  { v: 3, label: 'Acquis', court: '3' },
]
const ORDRE_PILIERS = ['Tactique', 'Technique', 'Physique', 'Mental']
const PILIERS_FIN = ['Tests', 'Oui / non', 'Par poste']
const COULEUR_PILIER = { Tactique: '#f59e0b', Technique: '#3b82f6', Physique: '#4ade80', Mental: '#a78bfa' }
const LIBELLE_POSTE = { gardien: 'Gardien', defenseur: 'Défenseur', milieu: 'Milieu', attaquant: 'Attaquant' }

// Période affichée selon le nombre d'évaluations réglé (aucune période inventée au-delà de 3).
function libelleRang(n, nb) {
  if (nb === 2) return n === 1 ? 'Début de saison' : 'Fin de saison'
  if (nb === 3) return ['Début de saison', 'Mi-saison', 'Fin de saison'][n - 1]
  return null
}

const moyenne = (liste) => (liste.length ? liste.reduce((s, x) => s + x, 0) / liste.length : null)
const fr1 = (x) => (x == null ? '' : (Math.round(x * 10) / 10).toString().replace('.', ','))

// Retrouve, dans les critères d'une fiche précédente, celui qui correspond à un critère actuel.
function critereCorrespondant(c, anciens) {
  return anciens.find(p => c.critere_origine_id === p.id)
    || (c.bibliotheque_critere_id ? anciens.find(p => p.bibliotheque_critere_id === c.bibliotheque_critere_id) : null)
    || anciens.find(p => p.pilier === c.pilier && p.libelle.trim().toLowerCase() === c.libelle.trim().toLowerCase())
    || null
}

function valeurDuResultat(c, r) {
  if (!r) return null
  if (c.type === 'note') return r.note
  if (c.type === 'test') return r.valeur
  if (c.type === 'oui_non') return r.oui_non
  return r.texte
}

function Evolution({ delta, bonSens = true, unite = '', colors }) {
  if (delta == null) return null
  if (Math.abs(delta) < 0.0001) return <span style={{ color: colors.text.faint, fontSize: 11, fontWeight: 700 }} title="Identique à la fiche précédente">=</span>
  const monte = delta > 0
  const bon = bonSens ? monte : !monte
  const txt = `${monte ? '+' : '−'}${fr1(Math.abs(delta))}${unite ? ' ' + unite : ''}`
  return (
    <span title="Par rapport à la fiche précédente" style={{ color: bon ? colors.accent.green : colors.accent.red, fontSize: 11, fontWeight: 800 }}>
      {monte ? '▲' : '▼'} {txt}
    </span>
  )
}

export default function FicheEvaluationNouvelle({ equipeJoueurId, joueurNom, poste, categorieCle, modele, version, criteres, params, readOnly = false, integre = false, onVisibiliteChange, onClose }) {
  const colors = useColors()
  const saison = saisonActuelle()
  const nb = params?.nb_evaluations_saison || null
  const [evals, setEvals] = useState(null) // toutes les évaluations du joueur (nature 'evaluation')
  const [resultats, setResultats] = useState({}) // evaluation_id -> { critere_id -> ligne }
  const [autoRes, setAutoRes] = useState({}) // auto-évaluation du joueur : evaluation_id -> { critere_id -> ligne }
  const [criteresAnciens, setCriteresAnciens] = useState([]) // critères des autres versions utilisées
  const [onglet, setOnglet] = useState(null) // { numero } ou { id } ou { nouvelle: true }
  const [etat, setEtat] = useState('') // '', 'enregistrement', 'ok', message d'erreur
  const [erreur, setErreur] = useState('')
  const timers = useRef({})
  const creation = useRef(null)

  const charger = useCallback(async () => {
    // Évaluations et leurs résultats en une seule requête
    const { data: ev, error } = await supabase.from('evaluations').select('*, evaluation_resultats(*)')
      .eq('equipe_joueur_id', equipeJoueurId).eq('nature', 'evaluation').order('created_at', { ascending: true })
    if (error) { setErreur('Impossible de charger les évaluations.'); setEvals([]); return }
    const res = {}
    const auto = {}
    const liste = (ev || []).map(({ evaluation_resultats: rs, ...e }) => {
      ;(rs || []).forEach(r => { ((r.source === 'joueur' ? auto : res)[r.evaluation_id] ||= {})[r.critere_id] = r })
      return e
    })
    setResultats(res)
    setAutoRes(auto)
    setEvals(liste)
    // Critères des anciennes versions : chargés après l'affichage, ils ne bloquent pas l'écran
    const versionsAutres = [...new Set(liste.map(e => e.version_id).filter(v => v !== version.id))]
    if (versionsAutres.length) {
      const { data: cs } = await supabase.from('criteres_evaluation').select('*').in('version_id', versionsAutres)
      setCriteresAnciens(cs || [])
    } else setCriteresAnciens([])
  }, [equipeJoueurId, version.id])
  useEffect(() => { charger() }, [charger])

  const evalsSaison = useMemo(() => (evals || []).filter(e => e.saison === saison), [evals, saison])

  // Onglets : un par numéro réglé (2 à 4), plus les évaluations à la demande.
  const onglets = useMemo(() => {
    const liste = []
    if (nb) {
      for (let n = 1; n <= nb; n++) liste.push({ cle: 'n' + n, numero: n, ev: evalsSaison.find(e => e.numero === n) || null })
    }
    evalsSaison.filter(e => !nb || e.numero == null).forEach(e => liste.push({ cle: 'e' + e.id, numero: e.numero, ev: e }))
    liste.push({ cle: 'nouvelle', numero: null, ev: null, nouvelle: true })
    return liste
  }, [nb, evalsSaison])

  useEffect(() => {
    if (!evals || onglet) return
    // Ouvre la première évaluation non terminée, sinon la dernière
    const cible = onglets.find(o => !o.nouvelle && (!o.ev || o.ev.statut !== 'terminee')) || [...onglets].reverse().find(o => o.ev) || onglets[0]
    setOnglet(cible.cle)
  }, [evals, onglets, onglet])

  const actif = onglets.find(o => o.cle === onglet) || null
  const ev = actif?.ev || null
  // Références à jour pour les enregistrements différés (évite de créer deux fiches)
  const evRef = useRef(null)
  const actifRef = useRef(null)
  evRef.current = ev
  actifRef.current = actif
  const termine = ev?.statut === 'terminee'
  const visibleJoueur = !!ev?.visible_joueur
  useEffect(() => { onVisibiliteChange?.(visibleJoueur) }, [visibleJoueur, onVisibiliteChange])
  const peutEditer = !readOnly && !termine

  // Fiche précédente : la plus récente des autres évaluations du joueur, créée avant celle-ci
  const precedente = useMemo(() => {
    if (!evals) return null
    const autres = evals.filter(e => !ev || (e.id !== ev.id && e.created_at < ev.created_at))
    // Une fiche sans aucun résultat ne sert pas de repère
    const avecResultats = autres.filter(e => Object.keys(resultats[e.id] || {}).length > 0)
    return avecResultats.length ? avecResultats[avecResultats.length - 1] : null
  }, [evals, ev, resultats])

  const criteresPrec = useMemo(() => {
    if (!precedente) return []
    return precedente.version_id === version.id ? criteres : criteresAnciens.filter(c => c.version_id === precedente.version_id)
  }, [precedente, criteres, criteresAnciens, version.id])

  const valeursPrec = useMemo(() => {
    const m = {}
    if (!precedente) return m
    criteres.forEach(c => {
      const p = criteresPrec.find(x => x.id === c.id) || critereCorrespondant(c, criteresPrec)
      if (p) m[c.id] = valeurDuResultat(c, (resultats[precedente.id] || {})[p.id])
    })
    return m
  }, [precedente, criteres, criteresPrec, resultats])

  // Critères visibles : ceux de poste seulement si le poste du joueur correspond (ou est inconnu)
  const criteresVisibles = useMemo(() => criteres.filter(c => !c.poste || !poste || c.poste === poste), [criteres, poste])
  const groupes = useMemo(() => {
    const m = new Map()
    criteresVisibles.forEach(c => {
      let nom = c.pilier
      if (c.type === 'commentaire' && !nom) nom = 'Autre'
      if (!m.has(nom)) m.set(nom, [])
      m.get(nom).push(c)
    })
    const cles = [...m.keys()]
    const rang = (k) => { const i = ORDRE_PILIERS.indexOf(k); if (i >= 0) return i; const j = PILIERS_FIN.indexOf(k); return j >= 0 ? 100 + j : 50 }
    cles.sort((a, b) => rang(a) - rang(b) || a.localeCompare(b))
    return cles.map(k => ({ nom: k, criteres: m.get(k).slice().sort((a, b) => a.ordre - b.ordre) }))
  }, [criteresVisibles])

  // ── Écriture ──────────────────────────────────────────────────────────────
  const assurerEvaluation = async (cible) => {
    if (cible) return cible
    if (evRef.current) return evRef.current
    if (creation.current) return creation.current
    creation.current = (async () => {
      const { data, error } = await supabase.from('evaluations').insert({
        equipe_joueur_id: equipeJoueurId, version_id: version.id, nature: 'evaluation', saison,
        numero: actifRef.current?.numero || null, statut: 'brouillon',
        visible_joueur: !!params?.visible_joueur_defaut, autorise_prefill_joueur: !!params?.prefill_joueur_defaut,
      }).select().single()
      creation.current = null
      if (error) throw error
      evRef.current = data
      setEvals(prev => [...(prev || []), data])
      setOnglet(nb && data.numero ? 'n' + data.numero : 'e' + data.id)
      return data
    })()
    return creation.current
  }

  const enregistrer = async (fn) => {
    setEtat('enregistrement'); setErreur('')
    try { await fn(); setEtat('ok') } catch (e) {
      console.error('[FicheEvaluationNouvelle]', e)
      setEtat(''); setErreur("Échec de l'enregistrement. Vérifie ta connexion et réessaie.")
    }
  }

  const ecrireResultat = (c, valeur, cible) => enregistrer(async () => {
    const e = await assurerEvaluation(cible)
    const ligne = { evaluation_id: e.id, critere_id: c.id, source: 'educateur', note: null, valeur: null, oui_non: null, texte: null }
    if (c.type === 'note') ligne.note = valeur
    else if (c.type === 'test') ligne.valeur = valeur
    else if (c.type === 'oui_non') ligne.oui_non = valeur
    else ligne.texte = valeur
    const vide = valeur === null || valeur === undefined || valeur === ''
    if (vide) {
      const { error } = await supabase.from('evaluation_resultats').delete().eq('evaluation_id', e.id).eq('critere_id', c.id).eq('source', 'educateur')
      if (error) throw error
      setResultats(prev => { const n = { ...prev, [e.id]: { ...(prev[e.id] || {}) } }; delete n[e.id][c.id]; return n })
    } else {
      const { data, error } = await supabase.from('evaluation_resultats').upsert(ligne, { onConflict: 'evaluation_id,critere_id,source' }).select().single()
      if (error) throw error
      setResultats(prev => ({ ...prev, [e.id]: { ...(prev[e.id] || {}), [c.id]: data } }))
    }
  })

  // Saisie : affichage immédiat, enregistrement différé pour les champs de texte et de chiffres
  const [brouillonsLocaux, setBrouillonsLocaux] = useState({})
  const saisir = (c, valeur, differe) => {
    setBrouillonsLocaux(prev => ({ ...prev, [c.id]: valeur }))
    clearTimeout(timers.current[c.id])
    const aEcrire = valeur === '' ? null : valeur
    const cible = evRef.current // la fiche visée au moment de la saisie, même si on change d'onglet ensuite
    if (differe) timers.current[c.id] = setTimeout(() => { ecrireResultat(c, aEcrire, cible) }, 700)
    else ecrireResultat(c, aEcrire, cible)
  }
  useEffect(() => { setBrouillonsLocaux({}) }, [onglet])
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), [])

  const majEvaluation = (champs, cible) => enregistrer(async () => {
    const e = await assurerEvaluation(cible)
    const { data, error } = await supabase.from('evaluations').update(champs).eq('id', e.id).select().single()
    if (error) throw error
    setEvals(prev => prev.map(x => (x.id === data.id ? data : x)))
  })

  const [textes, setTextes] = useState({})
  useEffect(() => { setTextes({}) }, [onglet])
  const saisirTexteFiche = (champ, valeur) => {
    setTextes(prev => ({ ...prev, [champ]: valeur }))
    clearTimeout(timers.current['f_' + champ])
    const cible = evRef.current
    timers.current['f_' + champ] = setTimeout(() => majEvaluation({ [champ]: valeur }, cible), 700)
  }
  const texteFiche = (champ) => (textes[champ] !== undefined ? textes[champ] : (ev?.[champ] || ''))

  const reprendreDerniere = () => enregistrer(async () => {
    if (!precedente) return
    const e = await assurerEvaluation()
    const lignes = []
    criteres.forEach(c => {
      const p = criteresPrec.find(x => x.id === c.id) || critereCorrespondant(c, criteresPrec)
      const r = p ? (resultats[precedente.id] || {})[p.id] : null
      if (!r) return
      lignes.push({ evaluation_id: e.id, critere_id: c.id, source: 'educateur', note: c.type === 'note' ? r.note : null, valeur: c.type === 'test' ? r.valeur : null, oui_non: c.type === 'oui_non' ? r.oui_non : null, texte: c.type === 'commentaire' ? r.texte : null })
    })
    if (lignes.length) {
      const { data, error } = await supabase.from('evaluation_resultats').upsert(lignes, { onConflict: 'evaluation_id,critere_id,source' }).select()
      if (error) throw error
      setResultats(prev => { const n = { ...(prev[e.id] || {}) }; data.forEach(r => { n[r.critere_id] = r }); return { ...prev, [e.id]: n } })
    }
    const { data: maj, error: err2 } = await supabase.from('evaluations').update({
      objectif_personnel: precedente.objectif_personnel || '', objectif_collectif: precedente.objectif_collectif || '',
    }).eq('id', e.id).select().single()
    if (err2) throw err2
    setEvals(prev => prev.map(x => (x.id === maj.id ? maj : x)))
    setTextes({})
  })

  const terminer = () => majEvaluation({ statut: 'terminee', verrouillee_joueur: true })
  const rouvrir = () => majEvaluation({ statut: 'brouillon' })

  const valeurCourante = (c) => {
    if (brouillonsLocaux[c.id] !== undefined) return brouillonsLocaux[c.id]
    const v = ev ? valeurDuResultat(c, (resultats[ev.id] || {})[c.id]) : null
    return v === undefined ? null : v
  }

  // ── Affichage ────────────────────────────────────────────────────────────
  const Enveloppe = integre ? CadreIntegre : Cadre
  if (!evals) {
    return <Enveloppe colors={colors} onClose={onClose}><p style={{ color: colors.text.faint, fontSize: 13 }}>Chargement…</p></Enveloppe>
  }

  const rangTxt = actif?.numero ? `Évaluation ${actif.numero}${nb ? ` sur ${nb}` : ''}` : 'Évaluation à la demande'
  const periode = nb && actif?.numero ? libelleRang(actif.numero, nb) : null
  const style = { champ: { background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: 8, color: colors.text.primary, fontSize: 13, fontFamily: 'Barlow, sans-serif', boxSizing: 'border-box' } }

  const ligneCritere = (c) => {
    const val = valeurCourante(c)
    const prec = valeursPrec[c.id]
    const auto = c.type === 'note' && ev ? (autoRes[ev.id] || {})[c.id]?.note : null
    const ecart = typeof auto === 'number' && typeof val === 'number' ? Math.abs(auto - val) : null
    return (
      <div key={c.id} style={{ padding: '10px 0', borderTop: `1px solid ${colors.border.subtle}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <div style={{ color: colors.text.primary, fontSize: 13, fontWeight: 700 }}>
              {c.libelle}
              {c.obligatoire && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, color: colors.text.faint, textTransform: 'uppercase' }}>Obligatoire</span>}
              {c.poste && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, color: colors.text.faint, textTransform: 'uppercase' }}>{LIBELLE_POSTE[c.poste]}</span>}
            </div>
            {c.acquis_quand && <div style={{ color: colors.text.faint, fontSize: 11, marginTop: 2 }}>Acquis quand : {c.acquis_quand}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {c.type === 'note' && (
              <>
                <div role="group" aria-label={c.libelle} style={{ display: 'flex', gap: 4 }}>
                  {ECHELLE.map(x => {
                    const choisi = val === x.v
                    return (
                      <button key={x.v} type="button" disabled={!peutEditer} onClick={() => saisir(c, choisi ? null : x.v, false)}
                        aria-pressed={choisi} title={x.label}
                        style={{ minWidth: 74, minHeight: 36, padding: '6px 8px', fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: peutEditer ? 'pointer' : 'default', fontFamily: 'Barlow, sans-serif',
                          background: choisi ? colors.accent.blue + '25' : colors.background.base, color: choisi ? colors.accent.blue : colors.text.faint,
                          border: `1px solid ${choisi ? colors.accent.blue : colors.border.default}` }}>
                        {x.court} · {x.label}
                      </button>
                    )
                  })}
                </div>
                {typeof prec === 'number' && val != null && <Evolution delta={val - prec} colors={colors} />}
                {typeof auto === 'number' && (
                  <span title="Auto-évaluation du joueur" style={{ fontSize: 11, fontWeight: ecart >= 2 ? 800 : 600, color: ecart >= 2 ? colors.accent.red : colors.text.secondary,
                    border: ecart >= 2 ? `1px solid ${colors.accent.red}` : 'none', borderRadius: 999, padding: ecart >= 2 ? '2px 8px' : 0 }}>
                    Joueur : {auto}{ecart >= 2 ? ' · gros écart' : ''}
                  </span>
                )}
                {typeof prec === 'number' && val == null && <span style={{ color: colors.text.faint, fontSize: 11 }}>Avant : {prec}</span>}
              </>
            )}
            {c.type === 'test' && (
              <>
                <input type="number" inputMode="decimal" step="any" min={0} disabled={!peutEditer}
                  value={val ?? ''} onChange={e => saisir(c, e.target.value === '' ? '' : parseFloat(e.target.value), true)}
                  aria-label={c.libelle} style={{ ...style.champ, width: 90, textAlign: 'center', fontWeight: 700 }} />
                <span style={{ color: colors.text.faint, fontSize: 12 }}>{c.unite}</span>
                {typeof prec === 'number' && <span style={{ color: colors.text.faint, fontSize: 11 }}>Avant : {fr1(prec)}</span>}
                {typeof prec === 'number' && typeof val === 'number' && <Evolution delta={val - prec} bonSens={c.sens !== 'plus_bas'} unite={c.unite} colors={colors} />}
                {c.objectif != null && <span style={{ color: colors.text.faint, fontSize: 11 }}>Objectif : {fr1(Number(c.objectif))} {c.unite}</span>}
              </>
            )}
            {c.type === 'oui_non' && (
              <>
                {[{ v: true, l: 'Oui' }, { v: false, l: 'Non' }].map(x => {
                  const choisi = val === x.v
                  return (
                    <button key={x.l} type="button" disabled={!peutEditer} onClick={() => saisir(c, choisi ? null : x.v, false)} aria-pressed={choisi}
                      style={{ minWidth: 64, minHeight: 36, fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: peutEditer ? 'pointer' : 'default', fontFamily: 'Barlow, sans-serif',
                        background: choisi ? colors.accent.blue + '25' : colors.background.base, color: choisi ? colors.accent.blue : colors.text.faint,
                        border: `1px solid ${choisi ? colors.accent.blue : colors.border.default}` }}>{x.l}</button>
                  )
                })}
                {typeof prec === 'boolean' && <span style={{ color: colors.text.faint, fontSize: 11 }}>Avant : {prec ? 'oui' : 'non'}</span>}
              </>
            )}
          </div>
        </div>
        {c.type === 'commentaire' && (
          <textarea rows={2} disabled={!peutEditer} value={val ?? ''} maxLength={2000}
            onChange={e => saisir(c, e.target.value, true)} aria-label={c.libelle}
            style={{ ...style.champ, width: '100%', marginTop: 6, resize: 'vertical' }} />
        )}
      </div>
    )
  }

  const carte = (g) => {
    const couleur = COULEUR_PILIER[g.nom] || colors.accent.blue
    const notes = g.criteres.filter(c => c.type === 'note')
    const vals = notes.map(c => valeurCourante(c)).filter(v => typeof v === 'number')
    const moy = moyenne(vals)
    // Moyenne précédente sur les mêmes critères
    const precs = notes.map(c => valeursPrec[c.id]).filter(v => typeof v === 'number')
    const moyPrec = moyenne(precs)
    return (
      <section key={g.nom} style={{ background: colors.background.surface, border: `1px solid ${couleur}33`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <h4 style={{ margin: 0, color: couleur, fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>{g.nom}</h4>
          {notes.length > 0 && (
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 12, color: colors.text.secondary }}>
              Moyenne : <strong style={{ color: colors.text.primary }}>{moy == null ? '—' : `${fr1(moy)} / 3`}</strong>
              <span style={{ color: colors.text.faint, fontSize: 11 }}>({vals.length}/{notes.length} notés)</span>
              {moy != null && moyPrec != null && <Evolution delta={moy - moyPrec} colors={colors} />}
            </span>
          )}
        </div>
        {g.criteres.map(ligneCritere)}
      </section>
    )
  }

  const nbEcarts = ev ? criteresVisibles.filter(c => {
    const a = (autoRes[ev.id] || {})[c.id]?.note, v = valeurCourante(c)
    return c.type === 'note' && typeof a === 'number' && typeof v === 'number' && Math.abs(a - v) >= 2
  }).length : 0
  return (
    <Enveloppe colors={colors} onClose={onClose}
      titre={`Fiche d'évaluation${joueurNom ? ` · ${joueurNom}` : ''}`}
      sous={[categorieCle ? labelCategorie(categorieCle) : null, poste ? LIBELLE_POSTE[poste] : null, `Saison ${saison}`, `${modele.nom} (version ${version.numero})`].filter(Boolean).join(' · ')}>
      <div role="tablist" style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${colors.border.subtle}`, marginBottom: 14, overflowX: 'auto' }}>
        {onglets.map(o => (
          <button key={o.cle} role="tab" aria-selected={onglet === o.cle} onClick={() => setOnglet(o.cle)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px 14px', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'Barlow, sans-serif',
              color: onglet === o.cle ? colors.accent.blue : colors.text.faint,
              borderBottom: onglet === o.cle ? `2px solid ${colors.accent.blue}` : '2px solid transparent' }}>
            {o.nouvelle ? '+ À la demande' : o.numero ? `Évaluation ${o.numero}` : `Du ${new Date(o.ev.date_evaluation + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
            {o.ev && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: o.ev.statut === 'terminee' ? colors.accent.green : colors.text.faint }}>{o.ev.statut === 'terminee' ? 'Terminée' : 'Brouillon'}</span>}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <div style={{ color: colors.text.primary, fontWeight: 800, fontSize: 14 }}>{rangTxt}</div>
          {periode && <div style={{ color: colors.text.faint, fontSize: 12 }}>{periode}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {etat === 'enregistrement' && <span style={{ color: colors.text.faint, fontSize: 12 }}>Enregistrement…</span>}
          {etat === 'ok' && <span style={{ color: colors.accent.green, fontSize: 12 }}>Brouillon enregistré</span>}
          {ev?.visible_joueur && <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: colors.accent.green, border: `1px solid ${colors.accent.green}`, borderRadius: 999, padding: '3px 8px' }}>Visible par le joueur</span>}
        </div>
      </div>
      {nbEcarts > 0 && <p style={{ color: colors.accent.red, fontSize: 12, fontWeight: 700, margin: '0 0 10px' }}>{nbEcarts} critère{nbEcarts > 1 ? 's' : ''} avec un gros écart entre l'auto-évaluation du joueur et ta note.</p>}
      {erreur && <p role="alert" style={{ color: colors.accent.red, fontSize: 12, margin: '0 0 10px' }}>{erreur}</p>}

      {peutEditer && precedente && (!ev || Object.keys(resultats[ev.id] || {}).length === 0) && (
        <div style={{ background: colors.accent.blue + '12', border: `1px solid ${colors.accent.blue}55`, borderRadius: 10, padding: 12, marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span style={{ color: colors.text.secondary, fontSize: 12 }}>
            Gagne du temps : recopie la fiche précédente ({new Date(precedente.date_evaluation + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}) et ne change que ce qui a bougé.
          </span>
          <button type="button" onClick={reprendreDerniere}
            style={{ background: colors.accent.blue, color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
            Reprendre la dernière
          </button>
        </div>
      )}
      {termine && !readOnly && (
        <p style={{ color: colors.text.faint, fontSize: 12, fontStyle: 'italic', margin: '0 0 12px' }}>
          Cette évaluation est terminée. <button type="button" onClick={rouvrir} style={{ background: 'none', border: 'none', color: colors.accent.blue, cursor: 'pointer', fontWeight: 700, padding: 0, fontSize: 12 }}>Rouvrir pour modifier</button>
        </p>
      )}

      {groupes.length === 0 && <p style={{ color: colors.text.faint, fontSize: 13 }}>Cette version du modèle ne contient aucun critère pour ce joueur.</p>}
      {groupes.map(carte)}

      <section style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
        {[['objectif_personnel', 'Objectif personnel', 1000], ['objectif_collectif', 'Objectif collectif', 1000], ['commentaire', 'Commentaire général', 2000]].map(([champ, label, max]) => (
          <label key={champ} style={{ display: 'block', marginBottom: 10 }}>
            <span style={{ display: 'block', color: colors.text.faint, fontSize: 10, fontWeight: 700, marginBottom: 4 }}>{label}</span>
            <textarea rows={2} disabled={!peutEditer} maxLength={max} value={texteFiche(champ)} onChange={e => saisirTexteFiche(champ, e.target.value)}
              style={{ ...style.champ, width: '100%', resize: 'vertical' }} />
          </label>
        ))}
        <p style={{ color: colors.text.faint, fontSize: 11, margin: 0 }}>Évite les données de santé dans ces champs.</p>
      </section>

      {!readOnly && (
        <section style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <Bascule colors={colors} actif={!!ev?.visible_joueur} couleur={colors.accent.green} disabled={termine}
            titre={ev?.visible_joueur ? 'Visible par le joueur' : 'Masquée au joueur'}
            texte={ev?.visible_joueur ? 'Le joueur verra cette évaluation une fois terminée' : 'Seul le staff voit cette évaluation'}
            onClick={() => majEvaluation({ visible_joueur: !ev?.visible_joueur })} />
          <Bascule colors={colors} actif={!!ev?.autorise_prefill_joueur} couleur={colors.accent.blue} disabled={termine}
            titre={ev?.autorise_prefill_joueur ? 'Auto-évaluation autorisée' : 'Auto-évaluation non autorisée'}
            texte="Le joueur peut se noter avant toi (ses notes s'affichent à côté des tiennes)"
            onClick={() => majEvaluation({ autorise_prefill_joueur: !ev?.autorise_prefill_joueur })} />
        </section>
      )}

      {!readOnly && !termine && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center' }}>
          {!ev && <span style={{ color: colors.text.faint, fontSize: 12 }}>Rien n'est créé tant que tu n'as pas rempli un critère.</span>}
          <button type="button" disabled={!ev || etat === 'enregistrement'} onClick={terminer}
            style={{ background: colors.accent.blue, color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 800, cursor: ev ? 'pointer' : 'default', opacity: ev ? 1 : 0.5 }}>
            Terminer l'évaluation
          </button>
        </div>
      )}
    </Enveloppe>
  )
}

function CadreIntegre({ children }) { return <div>{children}</div> }

function Bascule({ colors, actif, couleur, titre, texte, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ flex: '1 1 220px', textAlign: 'left', background: actif ? couleur + '15' : colors.background.surface, border: `1px solid ${actif ? couleur : colors.border.default}`, borderRadius: 10, padding: 12, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
      <div style={{ color: actif ? couleur : colors.text.faint, fontWeight: 700, fontSize: 12 }}>{titre}</div>
      <div style={{ color: colors.text.faint, fontSize: 11, marginTop: 2 }}>{texte}</div>
    </button>
  )
}

function Cadre({ colors, onClose, titre = "Fiche d'évaluation", sous, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-label={titre}
        style={{ background: colors.background.sunken, border: `1px solid ${colors.border.default}`, borderRadius: 16, padding: 20, width: '100%', maxWidth: 780, maxHeight: '92vh', overflowY: 'auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ color: colors.text.primary, margin: '0 0 4px', fontSize: 17, fontWeight: 800 }}>{titre}</h3>
            {sous && <p style={{ color: colors.text.faint, fontSize: 12, margin: 0 }}>{sous}</p>}
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: 24, cursor: 'pointer', lineHeight: 1, minWidth: 36, minHeight: 36 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}
