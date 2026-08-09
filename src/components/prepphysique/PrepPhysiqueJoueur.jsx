import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'

const TYPES_SEANCE = [
  { value: 'course', icon: '🏃' }, { value: 'renforcement', icon: '💪' },
  { value: 'fractionne', icon: '⚡' }, { value: 'circuit', icon: '🔄' },
  { value: 'gainage', icon: '🧘' }, { value: 'repos', icon: '❌' },
]

const st = {
  bg: '#0a0a0a', card: '#111', card2: '#1a1a1a', border: '#222',
  green: '#4ade80', text: '#fff', muted: '#888', red: '#ef4444', yellow: '#eab308',
}

function ModalSoumettre({ seance, joueurId, soumissionExistante, onClose, onSaved }) {
  const [mode, setMode] = useState('manuel')
  const [form, setForm] = useState({
    duree_reelle: soumissionExistante?.duree_reelle || '',
    distance_reelle: soumissionExistante?.distance_reelle || '',
    allure: soumissionExistante?.allure || '',
    calories: soumissionExistante?.calories || '',
    fc_moyenne: soumissionExistante?.fc_moyenne || '',
    rpe: soumissionExistante?.rpe || '',
    notes: soumissionExistante?.notes || '',
    date_realisation: soumissionExistante?.date_realisation || new Date().toISOString().split('T')[0],
    objectifs_atteints: soumissionExistante?.objectifs_atteints || false,
    bonus: soumissionExistante?.bonus || false,
  })
  // Course/fractionné = distance et durée à saisir (manuel ou scan) ; les autres types
  // (renforcement, gainage, circuit...) n'ont pas de distance/durée à mesurer, juste
  // une validation "objectifs atteints".
  const estCourse = ['course', 'fractionne'].includes(seance.type_seance)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(soumissionExistante?.proof_url || null)
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanNotice, setScanNotice] = useState(false)
  const fileRef = useRef()

  const scannerScreenshot = async (f) => {
    setScanning(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(',')[1]
      const { data, error } = await supabase.functions.invoke('scan-soumission', {
        body: { imageBase64: base64, mimeType: f.type },
      })
      setScanning(false)
      if (error || data?.error) {
        alert('Erreur analyse du screenshot : ' + (error?.message || data?.error))
        return
      }
      const r = data.resultat || {}
      setForm(prev => ({
        ...prev,
        distance_reelle: r.distance_km != null ? String(r.distance_km) : prev.distance_reelle,
        duree_reelle: r.duree_min != null ? String(r.duree_min) : prev.duree_reelle,
        allure: r.allure || prev.allure,
        fc_moyenne: r.fc_moyenne != null ? String(r.fc_moyenne) : prev.fc_moyenne,
      }))
      setScanNotice(true)
      setMode('manuel')
    }
    reader.readAsDataURL(f)
  }

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    scannerScreenshot(f)
  }

  const handleSave = async () => {
    setLoading(true)
    let proof_url = soumissionExistante?.proof_url || null
    if (file) {
      const ext = file.name.split('.').pop()
      const path = `prep_physique/${joueurId}/${seance.id}_${Date.now()}.${ext}`
      console.log('[Upload] Tentative upload vers proofs/', path)
      const { error: uploadError } = await supabase.storage.from('proofs').upload(path, file, { upsert: true })
      if (uploadError) {
        console.error('[Upload] Erreur:', uploadError)
        alert('Erreur upload image : ' + uploadError.message + '\n\nLa séance sera quand même enregistrée sans photo.')
      } else {
        const { data: urlData } = supabase.storage.from('proofs').getPublicUrl(path)
        proof_url = urlData.publicUrl
        console.log('[Upload] Succès. proof_url:', proof_url)
      }
    }
    const payload = {
      seance_id: seance.id, joueur_id: joueurId,
      date_realisation: form.date_realisation,
      duree_reelle: form.duree_reelle ? parseInt(form.duree_reelle) : null,
      distance_reelle: form.distance_reelle ? parseFloat(form.distance_reelle) : null,
      allure: form.allure || null,
      calories: form.calories ? parseInt(form.calories) : null,
      fc_moyenne: form.fc_moyenne ? parseInt(form.fc_moyenne) : null,
      rpe: form.rpe ? parseInt(form.rpe) : null,
      notes: form.notes || null,
      objectifs_atteints: form.objectifs_atteints || false,
      bonus: form.bonus || false,
      points: form.bonus ? 2 : 1,
      // Auto-validé : plus de bouton "Valider" côté éducateur, la soumission du
      // joueur est directement comptabilisée (classement, progression).
      proof_url, statut: 'valide',
    }
    // Optimistic à partir d'ici seulement : l'upload de la photo (ci-dessus)
    // doit rester séquentiel puisque proof_url en dépend, mais une fois le
    // payload prêt on ferme/valide côté UI tout de suite sans attendre la
    // confirmation d'écriture de la soumission, qui continue en arrière-plan.
    onSaved()
    const { error } = soumissionExistante?.id
      ? await supabase.from('soumissions_prep').update(payload).eq('id', soumissionExistante.id)
      : await supabase.from('soumissions_prep').insert(payload)
    setLoading(false)
    if (error) alert("Erreur lors de l'enregistrement : " + error.message)
  }

  const typeInfo = TYPES_SEANCE.find(t => t.value === seance.type_seance)
  const inp = { width: '100%', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, padding: '10px 14px', color: st.text, fontSize: 14, boxSizing: 'border-box' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: st.card, border: `1px solid ${st.border}`, borderRadius: 12, padding: 32, width: 480, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>{typeInfo?.icon}</div>
          <h3 style={{ color: st.text, margin: '0 0 4px' }}>{seance.titre}</h3>
          {seance.description && <p style={{ color: st.muted, fontSize: 13, margin: 0 }}>{seance.description}</p>}
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            {seance.duree_cible && <span style={{ color: st.green, fontSize: 13 }}>🎯 {seance.duree_cible} min</span>}
            {seance.distance_cible && <span style={{ color: st.green, fontSize: 13 }}>🎯 {seance.distance_cible} km</span>}
          </div>
        </div>
        {soumissionExistante && (
          <div style={{ background: soumissionExistante.statut === 'valide' ? '#14532d' : soumissionExistante.statut === 'refuse' ? '#450a0a' : '#1a1a00', border: `1px solid ${soumissionExistante.statut === 'valide' ? st.green : soumissionExistante.statut === 'refuse' ? st.red : st.yellow}`, borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 13, color: soumissionExistante.statut === 'valide' ? st.green : soumissionExistante.statut === 'refuse' ? st.red : st.yellow }}>
            {soumissionExistante.statut === 'valide' ? '✅ Validé par le coach' : soumissionExistante.statut === 'refuse' ? '❌ Refusé — tu peux renvoyer' : '⏳ En attente de validation'}
          </div>
        )}
        {estCourse && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: st.card2, borderRadius: 8, padding: 4 }}>
            {['manuel', 'upload'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: mode === m ? st.green : 'transparent', color: mode === m ? '#000' : st.muted }}>
                {m === 'manuel' ? '✍️ Saisie manuelle' : '📷 Screenshot'}
              </button>
            ))}
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Date de réalisation</label>
          <input type="date" value={form.date_realisation} onChange={e => setForm(f => ({ ...f, date_realisation: e.target.value }))} style={inp} />
        </div>
        {!estCourse ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ display: 'flex', gap: 12, alignItems: 'center', color: st.text, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.objectifs_atteints} onChange={e => setForm(f => ({ ...f, objectifs_atteints: e.target.checked }))} />
              ✅ J'ai atteint les objectifs de la séance
            </label>
            <label style={{ display: 'flex', gap: 12, alignItems: 'center', color: st.green, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.bonus} onChange={e => setForm(f => ({ ...f, bonus: e.target.checked }))} />
              ⭐ BONUS — J'ai fait plus que demandé
            </label>
            <div>
              <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Ressenti, conditions..." style={{ ...inp, resize: 'vertical' }} />
            </div>
          </div>
        ) : mode === 'manuel' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {scanNotice && (
              <div style={{ background: '#0a1a0a', border: `1px solid ${st.green}40`, borderRadius: 8, padding: 10, color: st.green, fontSize: 12 }}>
                ✨ Champs pré-remplis depuis le screenshot — vérifie avant de valider.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Durée (min)</label>
                <input type="number" value={form.duree_reelle} onChange={e => setForm(f => ({ ...f, duree_reelle: e.target.value }))} placeholder="35" style={inp} />
              </div>
              <div>
                <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Distance (km)</label>
                <input type="number" step="0.1" value={form.distance_reelle} onChange={e => setForm(f => ({ ...f, distance_reelle: e.target.value }))} placeholder="5.2" style={inp} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Allure (min:sec/km)</label>
                <input value={form.allure} onChange={e => setForm(f => ({ ...f, allure: e.target.value }))} placeholder="5:30" style={inp} />
              </div>
              <div>
                <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Calories</label>
                <input type="number" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))} placeholder="350" style={inp} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>FC moyenne (bpm)</label>
                <input type="number" value={form.fc_moyenne} onChange={e => setForm(f => ({ ...f, fc_moyenne: e.target.value }))} placeholder="152" style={inp} />
              </div>
              <div>
                <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>RPE (1-10)</label>
                <input type="number" min="1" max="10" value={form.rpe} onChange={e => setForm(f => ({ ...f, rpe: e.target.value }))} placeholder="7" style={inp} />
              </div>
            </div>
            <div>
              <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Ressenti, conditions..." style={{ ...inp, resize: 'vertical' }} />
            </div>
          </div>
        ) : (
          <div>
            <div onClick={() => !scanning && fileRef.current?.click()} style={{ border: `2px dashed ${preview ? st.green : st.border}`, borderRadius: 12, padding: 32, textAlign: 'center', cursor: scanning ? 'default' : 'pointer', background: st.card2 }}>
              {scanning ? (
                <div style={{ color: st.green, fontWeight: 600 }}>🔍 Analyse du screenshot en cours...</div>
              ) : preview ? <img src={preview} alt="Preview" style={{ maxWidth: '100%', borderRadius: 8 }} /> : (
                <>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
                  <div style={{ color: st.text, fontWeight: 600, marginBottom: 4 }}>Ajouter un screenshot</div>
                  <div style={{ color: st.muted, fontSize: 13 }}>Nike Run, Strava, Adidas Running, Decathlon Coach...</div>
                  <div style={{ color: st.green, fontSize: 12, marginTop: 8 }}>L'IA remplit distance / durée / allure / FC pour toi</div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} disabled={scanning} />
            {preview && !scanning && <button onClick={() => { setFile(null); setPreview(null); setScanNotice(false) }} style={{ width: '100%', marginTop: 8, background: 'transparent', border: `1px solid ${st.border}`, borderRadius: 8, color: st.muted, padding: '6px', cursor: 'pointer', fontSize: 12 }}>Changer l'image</button>}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, color: st.text, cursor: 'pointer' }}>Annuler</button>
          <button onClick={handleSave} disabled={loading} style={{ padding: '10px 20px', background: st.green, border: 'none', borderRadius: 8, color: '#000', fontWeight: 700, cursor: 'pointer' }}>
            {loading ? '...' : soumissionExistante ? 'Renvoyer' : 'Soumettre'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Carte lecture seule pour un test physique — saisi exclusivement par
// l'éducateur (voir GestionPrepPhysique.jsx) ; le joueur ne peut ni
// modifier ni supprimer. `precedent` sert à afficher l'évolution (↑/↓)
// par métrique par rapport au test juste avant celui-ci.
const METRIQUES_TESTS = [
  { key: 'cmj_cm', label: 'CMJ', unit: 'cm', cible: 38, gt: true },
  { key: 'sprint_10m_s', label: 'Sprint 10m', unit: 's', cible: 1.80, gt: false },
  { key: 'sprint_30m_s', label: 'Sprint 30m', unit: 's', cible: 4.30, gt: false },
  { key: 'test_30_15_kmh', label: '30-15 IFT', unit: ' km/h', cible: 18, gt: true },
]

function CarteTest({ test, precedent }) {
  return (
    <div style={{ background: st.card, border: `1px solid ${st.border}`, borderRadius: 12, padding: 20, marginBottom: 12 }}>
      <h3 style={{ color: st.text, margin: '0 0 16px', fontSize: 15 }}>🏆 Tests du {new Date(test.date_test).toLocaleDateString('fr-FR')}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {METRIQUES_TESTS.map(m => {
          const value = test[m.key]
          const atteint = value != null ? (m.gt ? value >= m.cible : value <= m.cible) : null
          const prevValue = precedent?.[m.key]
          const delta = value != null && prevValue != null ? Math.round((value - prevValue) * 100) / 100 : null
          return (
            <div key={m.key} style={{ background: st.card2, borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ color: st.muted, fontSize: 11 }}>{m.label}</span>
                {atteint != null && <span style={{ fontSize: 13 }}>{atteint ? '✅' : '❌'}</span>}
              </div>
              <div style={{ color: st.text, fontWeight: 700, fontSize: 20 }}>{value != null ? `${value}${m.unit}` : '—'}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                <span style={{ color: st.muted, fontSize: 10 }}>Objectif : {m.gt ? '≥' : '≤'} {m.cible}{m.unit}</span>
                {delta != null && delta !== 0 && (
                  <span style={{ color: delta > 0 ? '#60a5fa' : '#f97316', fontSize: 10, fontWeight: 700 }}>
                    {delta > 0 ? '↑' : '↓'} {delta > 0 ? '+' : ''}{delta}{m.unit}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {test.notes && <p style={{ color: st.muted, fontSize: 12, fontStyle: 'italic', margin: '12px 0 0' }}>💬 {test.notes}</p>}
    </div>
  )
}

export default function PrepPhysiqueJoueur({ joueurId, isMobile = false }) {
  const [programme, setProgramme] = useState(null)
  const [seances, setSeances] = useState([])
  const [soumissions, setSoumissions] = useState([])
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalSeance, setModalSeance] = useState(null)
  const [accordeonOuvert, setAccordeonOuvert] = useState(true)

  const load = async () => {
    setLoading(true)
    // Les tests physiques sont saisis par l'éducateur, indépendamment de tout
    // programme (colonne tests_physiques.programme_id supprimée) — chargés à
    // part, pour rester visibles même sans programme actif.
    const { data: testsData } = await supabase.from('tests_physiques').select('*').eq('joueur_id', joueurId).order('date_test', { ascending: false })
    setTests(testsData || [])

    // Un joueur ne doit voir que les programmes de ses éducateurs affiliés (table
    // `affiliations`, statut 'accepte') — pas le programme actif le plus récent
    // tous éducateurs confondus.
    const { data: afData, error: afError } = await supabase.from('affiliations').select('educateur_id').eq('joueur_id', joueurId).eq('statut', 'accepte')
    if (afError?.code === '42P01') { setError('tables_missing'); setLoading(false); return }
    const educateurIds = [...new Set((afData || []).map(a => a.educateur_id))]
    if (educateurIds.length === 0) { setProgramme(null); setLoading(false); return }

    // maybeSingle (pas single) : si un éducateur a plusieurs programmes actifs à la fois,
    // single() lève une erreur ("multiple rows") et masque tout au joueur.
    const { data, error } = await supabase.from('programmes_prep').select('*').in('educateur_id', educateurIds).eq('statut', 'actif').order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error?.code === '42P01') { setError('tables_missing'); setLoading(false); return }
    if (!data) { setProgramme(null); setLoading(false); return }
    setProgramme(data)
    const [s, sub] = await Promise.all([
      supabase.from('seances_prep').select('*').eq('programme_id', data.id).order('semaine').order('jour'),
      supabase.from('soumissions_prep').select('*').eq('joueur_id', joueurId),
    ])
    setSeances(s.data || [])
    setSoumissions(sub.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [joueurId])

  if (loading) return <div style={{ color: st.muted, textAlign: 'center', padding: 40 }}>Chargement...</div>

  if (error === 'tables_missing') return (
    <div style={{ background: '#1a1a00', border: '1px solid #444', borderRadius: 12, padding: 24 }}>
      <div style={{ color: st.yellow, fontWeight: 700 }}>⚠️ Fonctionnalité en cours d'activation</div>
    </div>
  )

  const sectionTests = (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ color: st.text, margin: 0, fontSize: 15 }}>🏆 Tests physiques</h3>
        <span style={{ color: st.muted, fontSize: 11, fontStyle: 'italic' }}>Résultats saisis par votre éducateur</span>
      </div>
      {tests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 16px', color: st.muted, background: st.card, border: `1px solid ${st.border}`, borderRadius: 12, fontSize: 13 }}>
          Aucun test enregistré pour le moment.
        </div>
      ) : (
        tests.map((test, i) => <CarteTest key={test.id} test={test} precedent={tests[i + 1]} />)
      )}
    </div>
  )

  if (!programme) return (
    <div style={{ padding: 16 }}>
      <div style={{ textAlign: 'center', padding: '40px 20px', color: st.muted }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏋️</div>
        <div style={{ color: st.text, marginBottom: 8 }}>Aucun programme actif</div>
        <div style={{ fontSize: 14 }}>Ton éducateur n'a pas encore créé de programme.</div>
      </div>
      {sectionTests}
    </div>
  )

  const nbTotal = seances.filter(s => s.type_seance !== 'repos').length
  const nbValides = soumissions.filter(s => s.statut === 'valide').length
  const progression = nbTotal > 0 ? Math.round((nbValides / nbTotal) * 100) : 0
  const mesSoumissions = soumissions
    .map(s => ({ ...s, seance: seances.find(se => se.id === s.seance_id) }))
    .filter(s => s.seance)
    .sort((a, b) => new Date(b.date_realisation || b.created_at) - new Date(a.date_realisation || a.created_at))

  return (
    <div style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ background: st.card, border: `1px solid ${st.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ color: st.text, margin: '0 0 4px', fontSize: 18 }}>🏋️ {programme.titre}</h2>
            <p style={{ color: st.muted, fontSize: 13, margin: 0 }}>
              {new Date(programme.date_debut).toLocaleDateString('fr-FR')} → {new Date(programme.date_fin).toLocaleDateString('fr-FR')}
            </p>
            {programme.description && <p style={{ color: st.muted, fontSize: 13, margin: '8px 0 0' }}>{programme.description}</p>}
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: st.muted, fontSize: 12 }}>Progression</span>
            <span style={{ color: st.green, fontWeight: 700 }}>{progression}%</span>
          </div>
          <div style={{ background: st.card2, borderRadius: 99, height: 8 }}>
            <div style={{ background: st.green, borderRadius: 99, height: 8, width: `${progression}%`, transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <span style={{ color: st.green, fontSize: 12 }}>✅ {nbValides} validées</span>
            <span style={{ color: st.muted, fontSize: 12 }}>📋 {nbTotal - nbValides} à faire</span>
          </div>
        </div>
      </div>

      {/* Grille */}
      {Array.from({ length: programme.nb_semaines || 2 }, (_, i) => i + 1).map(sem => (
        <div key={sem} style={{ marginBottom: 24 }}>
          <h3 style={{ color: st.green, marginBottom: 12, fontSize: 13, fontWeight: 700, letterSpacing: '0.05em' }}>SEMAINE {sem}</h3>
          <div style={{ overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(90px, 1fr))', gap: 6, minWidth: isMobile ? 630 : 'auto' }}>
              {Array.from({ length: 7 }, (_, ji) => ji + 1).map(jour => {
                const seance = seances.find(s => s.semaine === sem && s.jour === jour)
                const soumission = seance ? soumissions.find(s => s.seance_id === seance.id) : null
                const isRepos = seance?.type_seance === 'repos'
                const typeInfo = seance ? TYPES_SEANCE.find(t => t.value === seance.type_seance) : null
                let borderColor = st.border, bgColor = st.card, statusIcon = null
                if (seance && !isRepos) {
                  if (soumission?.statut === 'valide') { borderColor = st.green; bgColor = '#0a1a0a'; statusIcon = '✅' }
                  else if (soumission?.statut === 'soumis') { borderColor = st.yellow; bgColor = '#1a1a00'; statusIcon = '⏳' }
                  else if (soumission?.statut === 'refuse') { borderColor = st.red; bgColor = '#1a0000'; statusIcon = '🔄' }
                }
                return (
                  <div key={jour}>
                    <div style={{ color: st.muted, fontSize: 10, textAlign: 'center', marginBottom: 3, fontWeight: 600 }}>{'LMMJVSD'[jour - 1]}</div>
                    <div onClick={() => seance && !isRepos && setModalSeance({ seance, soumission })}
                      style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 8, padding: 8, minHeight: 72, cursor: seance && !isRepos ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, opacity: isRepos ? 0.4 : 1 }}>
                      {seance ? (
                        <>
                          <div style={{ fontSize: statusIcon ? 14 : 18 }}>{statusIcon || typeInfo?.icon || '🏋️'}</div>
                          <div style={{ color: st.text, fontSize: 9, textAlign: 'center', lineHeight: 1.2 }}>{seance.titre.substring(0, 18)}{seance.titre.length > 18 ? '…' : ''}</div>
                        </>
                      ) : <div style={{ color: st.border }}>—</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ))}

      {/* Mes séances soumises (récap) */}
      {mesSoumissions.length > 0 && (
        <div style={{ background: st.card, border: `1px solid ${st.border}`, borderRadius: 12, marginBottom: 20, overflow: 'hidden' }}>
          <button onClick={() => setAccordeonOuvert(o => !o)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', color: st.text, fontWeight: 700, fontSize: 14 }}>
            <span>{accordeonOuvert ? '▼' : '▶'}</span> Mes séances soumises ({mesSoumissions.length})
          </button>
          {accordeonOuvert && (
            <div style={{ padding: '0 20px 16px' }}>
              {mesSoumissions.map(s => {
                const estCourseS = ['course', 'fractionne'].includes(s.seance.type_seance)
                return (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: `1px solid ${st.border}`, flexWrap: 'wrap' }}>
                    <span style={{ color: st.text, fontSize: 13 }}>{s.seance.titre}</span>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 12, color: st.muted, flexWrap: 'wrap' }}>
                      {estCourseS ? (
                        <>
                          {s.distance_reelle != null && <span>{s.distance_reelle} km</span>}
                          {s.duree_reelle != null && <span>{s.duree_reelle} min</span>}
                          {s.allure && <span>{s.allure}/km</span>}
                        </>
                      ) : (
                        <>
                          {s.objectifs_atteints && <span style={{ color: st.green }}>✅ Objectifs atteints</span>}
                          {s.bonus && <span style={{ color: st.yellow }}>⭐ Bonus</span>}
                        </>
                      )}
                      {s.proof_url && <a href={s.proof_url} target="_blank" rel="noreferrer" style={{ color: st.green, textDecoration: 'none' }}>📎 Voir</a>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {sectionTests}

      {modalSeance && <ModalSoumettre seance={modalSeance.seance} joueurId={joueurId} soumissionExistante={modalSeance.soumission} onClose={() => setModalSeance(null)} onSaved={async () => { await load(); setModalSeance(null) }} />}
    </div>
  )
}
