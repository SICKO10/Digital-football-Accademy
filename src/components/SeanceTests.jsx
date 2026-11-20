// Séance de tests en bord de terrain (bloc 8 de PLAN-fiches-evaluation.md).
// Un test à la fois, tous les joueurs de l'équipe l'un sous l'autre : grandes zones tactiles,
// clavier numérique, bouton « Suivant », enregistrement automatique dans la fiche de chaque joueur.
// Chaque joueur reçoit une évaluation de nature « tests » à la date de la séance
// (brouillon, puis « terminée » quand on clôt la séance). Tables : evaluations, evaluation_resultats.
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { saisonActuelle } from '../lib/saison'

const fr1 = (x) => (x == null ? '' : (Math.round(x * 100) / 100).toString().replace('.', ','))
const aujourdhui = () => new Date().toLocaleDateString('sv-SE') // AAAA-MM-JJ, heure locale

export default function SeanceTests({ joueurs, educateurId, readOnly = false, onClose }) {
  const colors = useColors()
  const saison = saisonActuelle()
  const [cadre, setCadre] = useState(null) // null = chargement ; { erreur } ou { version, tests, params, categorieCle }
  const [date, setDate] = useState(aujourdhui())
  const [testId, setTestId] = useState(null)
  const [evals, setEvals] = useState({}) // equipe_joueur_id -> évaluation « tests » de la date
  const [valeurs, setValeurs] = useState({}) // critere_id -> { evaluation_id -> ligne résultat }
  const [saisies, setSaisies] = useState({}) // equipe_joueur_id -> texte en cours de frappe
  const [etat, setEtat] = useState({}) // equipe_joueur_id -> 'envoi' | 'ok' | 'erreur'
  const [erreur, setErreur] = useState('')
  const champs = useRef({})
  const creations = useRef({})
  const timers = useRef({})

  const liste = useMemo(() => (joueurs || []).slice().sort((a, b) => (a.nom || '').localeCompare(b.nom || '')), [joueurs])

  // Modèle publié de la catégorie de l'équipe (celui de l'éducateur d'abord, sinon celui du club)
  useEffect(() => {
    let annule = false
    ;(async () => {
      try {
        if (!liste.length) { setCadre({ erreur: "Ajoute d'abord des joueurs à l'équipe." }); return }
        const { data: cle } = await supabase.rpc('secu_categorie_effectif', { p_equipe_joueur_id: liste[0].id })
        if (!cle) { setCadre({ erreur: "La catégorie de l'équipe n'est pas reconnue : la séance de tests n'est pas disponible." }); return }
        const { data: modeles } = await supabase.from('modeles_evaluation').select('*').eq('categorie_cle', cle).eq('archive', false)
        const tri = (modeles || []).slice().sort((a, b) => (b.educateur_id === educateurId) - (a.educateur_id === educateurId))
        for (const modele of tri) {
          const { data: versions } = await supabase.from('modeles_evaluation_versions').select('*')
            .eq('modele_id', modele.id).not('publiee_le', 'is', null).order('numero', { ascending: false }).limit(1)
          const version = versions?.[0]
          if (!version) continue
          const { data: criteres } = await supabase.from('criteres_evaluation').select('*').eq('version_id', version.id).eq('type', 'test').order('ordre', { ascending: true })
          if (!criteres?.length) continue
          const proprios = [modele.club_id, modele.educateur_id, educateurId].filter(Boolean)
          const { data: lignes } = await supabase.from('parametres_evaluation').select('*').in('proprietaire_id', proprios)
          const params = (lignes || []).find(l => l.proprietaire_id === modele.club_id) || (lignes || []).find(l => l.proprietaire_id === educateurId) || null
          if (!annule) { setCadre({ version, tests: criteres, params, categorieCle: cle }); setTestId(criteres[0].id) }
          return
        }
        if (!annule) setCadre({ erreur: "Aucune fiche publiée ne contient de test pour cette catégorie. Ajoute des tests dans « Ma fiche d'évaluation » (ou dans la fiche du club) et publie-la." })
      } catch (e) {
        console.error('[SeanceTests]', e)
        if (!annule) setCadre({ erreur: 'Impossible de charger la séance de tests.' })
      }
    })()
    return () => { annule = true }
  }, [liste, educateurId])

  // Évaluations « tests » déjà ouvertes à cette date + leurs mesures
  const charger = useCallback(async () => {
    if (!cadre?.version) return
    const ids = liste.map(j => j.id)
    const { data: ev, error } = await supabase.from('evaluations').select('*')
      .in('equipe_joueur_id', ids).eq('nature', 'tests').eq('date_evaluation', date).eq('version_id', cadre.version.id)
    if (error) { setErreur('Impossible de relire la séance.'); return }
    const parJoueur = {}
    ;(ev || []).forEach(e => { parJoueur[e.equipe_joueur_id] = e })
    const vals = {}
    if ((ev || []).length) {
      const { data: rs } = await supabase.from('evaluation_resultats').select('*').in('evaluation_id', ev.map(e => e.id)).eq('source', 'educateur')
      ;(rs || []).forEach(r => { (vals[r.critere_id] ||= {})[r.evaluation_id] = r })
    }
    setEvals(parJoueur); setValeurs(vals); setSaisies({}); setEtat({})
  }, [cadre, liste, date])
  useEffect(() => { charger() }, [charger])
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), [])

  const test = cadre?.tests?.find(t => t.id === testId) || null

  // Dernière mesure de chaque joueur sur ce test (autres séances), pour situer la nouvelle valeur
  const [avant, setAvant] = useState({})
  useEffect(() => {
    if (!test || !liste.length) { setAvant({}); return }
    let annule = false
    ;(async () => {
      const { data: ev } = await supabase.from('evaluations').select('id,equipe_joueur_id,date_evaluation')
        .in('equipe_joueur_id', liste.map(j => j.id)).eq('nature', 'tests').lt('date_evaluation', date)
      if (!ev?.length) { if (!annule) setAvant({}); return }
      const { data: rs } = await supabase.from('evaluation_resultats').select('evaluation_id,valeur,critere_id')
        .in('evaluation_id', ev.map(e => e.id)).eq('critere_id', test.id).eq('source', 'educateur').not('valeur', 'is', null)
      const dateDe = Object.fromEntries(ev.map(e => [e.id, e]))
      const m = {}
      ;(rs || []).forEach(r => {
        const e = dateDe[r.evaluation_id]
        if (!m[e.equipe_joueur_id] || m[e.equipe_joueur_id].date < e.date_evaluation) m[e.equipe_joueur_id] = { date: e.date_evaluation, valeur: Number(r.valeur) }
      })
      if (!annule) setAvant(m)
    })()
    return () => { annule = true }
  }, [test, liste, date])

  const assurerEvaluation = async (j) => {
    if (evals[j.id]) return evals[j.id]
    if (creations.current[j.id]) return creations.current[j.id]
    creations.current[j.id] = (async () => {
      const { data, error } = await supabase.from('evaluations').insert({
        equipe_joueur_id: j.id, version_id: cadre.version.id, nature: 'tests', saison, date_evaluation: date, statut: 'brouillon',
        visible_joueur: !!cadre.params?.tests_visibles_joueur_defaut, autorise_prefill_joueur: !!cadre.params?.tests_prefill_joueur_defaut,
      }).select().single()
      delete creations.current[j.id]
      if (error) throw error
      setEvals(prev => ({ ...prev, [j.id]: data }))
      return data
    })()
    return creations.current[j.id]
  }

  const ecrire = async (j, critere, texte) => {
    setEtat(p => ({ ...p, [j.id]: 'envoi' })); setErreur('')
    try {
      const e = await assurerEvaluation(j)
      if (texte === '') {
        const { error } = await supabase.from('evaluation_resultats').delete().eq('evaluation_id', e.id).eq('critere_id', critere.id).eq('source', 'educateur')
        if (error) throw error
        setValeurs(p => { const n = { ...p, [critere.id]: { ...(p[critere.id] || {}) } }; delete n[critere.id][e.id]; return n })
      } else {
        const { data, error } = await supabase.from('evaluation_resultats')
          .upsert({ evaluation_id: e.id, critere_id: critere.id, source: 'educateur', valeur: Number(texte), note: null, oui_non: null, texte: null }, { onConflict: 'evaluation_id,critere_id,source' })
          .select().single()
        if (error) throw error
        setValeurs(p => ({ ...p, [critere.id]: { ...(p[critere.id] || {}), [e.id]: data } }))
      }
      setEtat(p => ({ ...p, [j.id]: 'ok' }))
    } catch (err) {
      console.error('[SeanceTests]', err)
      setEtat(p => ({ ...p, [j.id]: 'erreur' }))
      setErreur("Une mesure n'a pas été enregistrée. Vérifie ta connexion et ressaisis-la.")
    }
  }

  const saisir = (j, brut) => {
    const texte = brut.replace(',', '.')
    if (texte !== '' && !/^\d{0,5}(\.\d{0,3})?$/.test(texte)) return
    setSaisies(p => ({ ...p, [j.id]: texte }))
    clearTimeout(timers.current[j.id])
    const critere = test
    timers.current[j.id] = setTimeout(() => { if (texte === '' || !Number.isNaN(Number(texte))) ecrire(j, critere, texte) }, 600)
  }

  const valeurAffichee = (j) => {
    if (saisies[j.id] !== undefined) return saisies[j.id].replace('.', ',')
    const e = evals[j.id]
    const r = e ? (valeurs[testId] || {})[e.id] : null
    return r?.valeur != null ? fr1(Number(r.valeur)) : ''
  }
  const valeurNum = (j) => {
    const v = valeurAffichee(j).replace(',', '.')
    return v === '' || Number.isNaN(Number(v)) ? null : Number(v)
  }

  // « Suivant » : envoie tout de suite et passe au champ du joueur suivant
  const suivant = (j, i) => {
    clearTimeout(timers.current[j.id])
    if (saisies[j.id] !== undefined) ecrire(j, test, saisies[j.id])
    const prochain = liste[i + 1]
    if (prochain) champs.current[prochain.id]?.focus(); else champs.current[j.id]?.blur()
  }

  const terminerSeance = async () => {
    setErreur('')
    Object.values(timers.current).forEach(clearTimeout)
    const aEnvoyer = Object.entries(saisies)
    for (const [id, texte] of aEnvoyer) {
      const j = liste.find(x => String(x.id) === String(id))
      if (j && test) await ecrire(j, test, texte)
    }
    const ouverts = Object.values(evals).filter(e => e.statut !== 'terminee').map(e => e.id)
    if (ouverts.length) {
      const { error } = await supabase.from('evaluations').update({ statut: 'terminee', verrouillee_joueur: true }).in('id', ouverts)
      if (error) { setErreur('Impossible de terminer la séance. Réessaie.'); return }
    }
    charger()
  }

  const rouvrirSeance = async () => {
    setErreur('')
    const ids = Object.values(evals).map(e => e.id)
    const { error } = await supabase.from('evaluations').update({ statut: 'brouillon' }).in('id', ids)
    if (error) { setErreur('Impossible de rouvrir la séance. Réessaie.'); return }
    charger()
  }

  const nbSaisis = test ? liste.filter(j => valeurNum(j) != null).length : 0
  const terminees = Object.values(evals).length > 0 && Object.values(evals).every(e => e.statut === 'terminee')
  const bloque = readOnly || terminees

  const gros = { background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 10, padding: '12px 10px', color: colors.text.primary, fontSize: 22, fontWeight: 800, textAlign: 'center', fontFamily: 'Barlow, sans-serif', boxSizing: 'border-box', width: 120, minHeight: 52 }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-label="Séance de tests"
        style={{ background: colors.background.sunken, border: `1px solid ${colors.border.default}`, borderRadius: 16, padding: 16, width: '100%', maxWidth: 640, maxHeight: '96vh', overflowY: 'auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ color: colors.text.primary, margin: '0 0 2px', fontSize: 17, fontWeight: 800 }}>Séance de tests</h3>
            <p style={{ color: colors.text.faint, fontSize: 12, margin: 0 }}>Un test à la fois, tous les joueurs. Chaque mesure s'enregistre toute seule dans la fiche du joueur.</p>
          </div>
          <button onClick={onClose} aria-label="Fermer" style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: 26, cursor: 'pointer', lineHeight: 1, minWidth: 44, minHeight: 44 }}>×</button>
        </div>

        {!cadre && <p style={{ color: colors.text.faint, fontSize: 13 }}>Chargement…</p>}
        {cadre?.erreur && <p style={{ color: colors.text.secondary, fontSize: 13 }}>{cadre.erreur}</p>}

        {cadre?.tests && (
          <>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: colors.text.faint, fontSize: 12, fontWeight: 700 }}>
              Date de la séance
              <input type="date" value={date} max={aujourdhui()} onChange={e => e.target.value && setDate(e.target.value)}
                style={{ background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '8px 10px', color: colors.text.primary, fontSize: 14, minHeight: 40 }} />
            </label>

            <div role="tablist" aria-label="Test" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 8 }}>
              {cadre.tests.map(t => (
                <button key={t.id} role="tab" aria-selected={t.id === testId} onClick={() => { Object.values(timers.current).forEach(clearTimeout); setSaisies({}); setTestId(t.id) }}
                  style={{ flex: '0 0 auto', minHeight: 44, padding: '8px 16px', borderRadius: 999, fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'Barlow, sans-serif',
                    background: t.id === testId ? colors.accent.blue + '25' : colors.background.base, color: t.id === testId ? colors.accent.blue : colors.text.faint,
                    border: `1px solid ${t.id === testId ? colors.accent.blue : colors.border.default}` }}>
                  {t.libelle}
                </button>
              ))}
            </div>

            {test && (
              <p style={{ color: colors.text.secondary, fontSize: 12, margin: '0 0 10px' }}>
                {test.unite ? <>Unité : <strong>{test.unite}</strong>. </> : null}
                {test.sens === 'plus_bas' ? 'Plus la valeur est basse, meilleur est le résultat. ' : null}
                {test.objectif != null ? <>Objectif : <strong>{fr1(Number(test.objectif))} {test.unite}</strong>. </> : null}
                <strong>{nbSaisis}/{liste.length}</strong> joueurs mesurés.
              </p>
            )}

            {terminees && (
              <p style={{ color: colors.accent.green, fontSize: 12, fontWeight: 700, margin: '0 0 10px' }}>
                Séance terminée. Les mesures sont dans les fiches des joueurs (onglet Tests).{' '}
                {!readOnly && <button type="button" onClick={rouvrirSeance} style={{ background: 'none', border: 'none', color: colors.accent.blue, cursor: 'pointer', fontWeight: 700, padding: 0, fontSize: 12 }}>Rouvrir pour corriger</button>}
              </p>
            )}
            {erreur && <p role="alert" style={{ color: colors.accent.red, fontSize: 12, margin: '0 0 10px' }}>{erreur}</p>}

            <div>
              {liste.map((j, i) => {
                const v = valeurNum(j)
                const p = avant[j.id]
                const delta = v != null && p ? v - p.valeur : null
                const bon = delta != null && (test?.sens === 'plus_bas' ? delta < 0 : delta > 0)
                return (
                  <div key={j.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderTop: `1px solid ${colors.border.subtle}` }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: colors.text.primary, fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {j.numero_maillot ? <span style={{ color: colors.text.faint, fontWeight: 800, marginRight: 8 }}>{j.numero_maillot}</span> : null}
                        {j.prenom} {j.nom}
                      </div>
                      <div style={{ fontSize: 11, color: colors.text.faint, minHeight: 14 }}>
                        {p ? <>Avant : {fr1(p.valeur)} {test?.unite}</> : 'Première mesure'}
                        {delta != null && Math.abs(delta) > 0.0001 && (
                          <span style={{ marginLeft: 8, fontWeight: 800, color: bon ? colors.accent.green : colors.accent.red }}>
                            {delta > 0 ? '▲ +' : '▼ −'}{fr1(Math.abs(delta))}
                          </span>
                        )}
                        {etat[j.id] === 'envoi' && <span style={{ marginLeft: 8 }}>Enregistrement…</span>}
                        {etat[j.id] === 'ok' && <span style={{ marginLeft: 8, color: colors.accent.green }}>Enregistré</span>}
                        {etat[j.id] === 'erreur' && <span style={{ marginLeft: 8, color: colors.accent.red, fontWeight: 700 }}>Non enregistré</span>}
                      </div>
                    </div>
                    <input ref={el => { champs.current[j.id] = el }} type="text" inputMode="decimal" enterKeyHint={i === liste.length - 1 ? 'done' : 'next'}
                      disabled={bloque} value={valeurAffichee(j)} placeholder="—" aria-label={`${test?.libelle || 'Test'} : ${j.prenom} ${j.nom}`}
                      onChange={e => saisir(j, e.target.value)} onFocus={e => e.target.select()}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); suivant(j, i) } }}
                      onBlur={() => { if (saisies[j.id] !== undefined) { clearTimeout(timers.current[j.id]); ecrire(j, test, saisies[j.id]) } }}
                      style={gros} />
                  </div>
                )
              })}
            </div>

            {!bloque && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <button type="button" onClick={terminerSeance} disabled={Object.keys(evals).length === 0 && Object.keys(saisies).length === 0}
                  style={{ background: colors.accent.blue, color: '#0a0a0a', border: 'none', borderRadius: 10, padding: '14px 24px', minHeight: 52, fontWeight: 800, fontSize: 14, cursor: 'pointer', opacity: Object.keys(evals).length === 0 && Object.keys(saisies).length === 0 ? 0.5 : 1 }}>
                  Terminer la séance
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
