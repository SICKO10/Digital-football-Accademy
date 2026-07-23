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
    notes: soumissionExistante?.notes || '',
    date_realisation: soumissionExistante?.date_realisation || new Date().toISOString().split('T')[0],
  })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(soumissionExistante?.proof_url || null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleSave = async () => {
    setLoading(true)
    let proof_url = soumissionExistante?.proof_url || null
    if (file) {
      const ext = file.name.split('.').pop()
      const path = `prep_physique/${joueurId}/${seance.id}_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('proofs').upload(path, file, { upsert: true })
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('proofs').getPublicUrl(path)
        proof_url = urlData.publicUrl
      }
    }
    const payload = {
      seance_id: seance.id, joueur_id: joueurId,
      date_realisation: form.date_realisation,
      duree_reelle: form.duree_reelle ? parseInt(form.duree_reelle) : null,
      distance_reelle: form.distance_reelle ? parseFloat(form.distance_reelle) : null,
      allure: form.allure || null,
      calories: form.calories ? parseInt(form.calories) : null,
      notes: form.notes || null,
      proof_url, statut: 'soumis',
    }
    const { error } = soumissionExistante?.id
      ? await supabase.from('soumissions_prep').update(payload).eq('id', soumissionExistante.id)
      : await supabase.from('soumissions_prep').insert(payload)
    setLoading(false)
    if (!error) onSaved()
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
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: st.card2, borderRadius: 8, padding: 4 }}>
          {['manuel', 'upload'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: mode === m ? st.green : 'transparent', color: mode === m ? '#000' : st.muted }}>
              {m === 'manuel' ? '✍️ Saisie manuelle' : '📷 Screenshot'}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Date de réalisation</label>
          <input type="date" value={form.date_realisation} onChange={e => setForm(f => ({ ...f, date_realisation: e.target.value }))} style={inp} />
        </div>
        {mode === 'manuel' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
            <div>
              <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Ressenti, conditions..." style={{ ...inp, resize: 'vertical' }} />
            </div>
          </div>
        ) : (
          <div>
            <div onClick={() => fileRef.current?.click()} style={{ border: `2px dashed ${preview ? st.green : st.border}`, borderRadius: 12, padding: 32, textAlign: 'center', cursor: 'pointer', background: st.card2 }}>
              {preview ? <img src={preview} alt="Preview" style={{ maxWidth: '100%', borderRadius: 8 }} /> : (
                <>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📷</div>
                  <div style={{ color: st.text, fontWeight: 600, marginBottom: 4 }}>Ajouter un screenshot</div>
                  <div style={{ color: st.muted, fontSize: 13 }}>Nike Run, Strava, Adidas Running, Decathlon Coach...</div>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
            {preview && <button onClick={() => { setFile(null); setPreview(null) }} style={{ width: '100%', marginTop: 8, background: 'transparent', border: `1px solid ${st.border}`, borderRadius: 8, color: st.muted, padding: '6px', cursor: 'pointer', fontSize: 12 }}>Changer l'image</button>}
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

function ModalTests({ joueurId, programmeId, testExistant, onClose, onSaved }) {
  const [form, setForm] = useState({
    date_test: testExistant?.date_test || new Date().toISOString().split('T')[0],
    cmj_cm: testExistant?.cmj_cm || '',
    sprint_10m: testExistant?.sprint_10m || '',
    sprint_30m: testExistant?.sprint_30m || '',
    yoyo_ir1_m: testExistant?.yoyo_ir1_m || '',
    notes: testExistant?.notes || '',
  })
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    const payload = { joueur_id: joueurId, programme_id: programmeId, date_test: form.date_test, cmj_cm: form.cmj_cm ? parseFloat(form.cmj_cm) : null, sprint_10m: form.sprint_10m ? parseFloat(form.sprint_10m) : null, sprint_30m: form.sprint_30m ? parseFloat(form.sprint_30m) : null, yoyo_ir1_m: form.yoyo_ir1_m ? parseInt(form.yoyo_ir1_m) : null, notes: form.notes || null }
    const { error } = testExistant?.id
      ? await supabase.from('tests_physiques').update(payload).eq('id', testExistant.id)
      : await supabase.from('tests_physiques').insert(payload)
    setLoading(false)
    if (!error) onSaved()
  }

  const tests = [
    { key: 'cmj_cm', label: 'CMJ — Saut vertical', unit: 'cm', placeholder: '38', icon: '⬆️', cible: '> 38 cm' },
    { key: 'sprint_10m', label: 'Sprint 10m', unit: 's', placeholder: '1.80', icon: '⚡', cible: '< 1,80 s' },
    { key: 'sprint_30m', label: 'Sprint 30m', unit: 's', placeholder: '4.30', icon: '💨', cible: '< 4,30 s' },
    { key: 'yoyo_ir1_m', label: 'Yo-Yo IR1', unit: 'm', placeholder: '1800', icon: '🔄', cible: '> 1800 m' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: st.card, border: `1px solid ${st.border}`, borderRadius: 12, padding: 32, width: 480, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ color: st.text, marginBottom: 4 }}>🏆 Tests physiques</h3>
        <p style={{ color: st.muted, fontSize: 14, marginBottom: 20 }}>Saisis tes résultats des tests du 5 août</p>
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Date des tests</label>
          <input type="date" value={form.date_test} onChange={e => setForm(f => ({ ...f, date_test: e.target.value }))} style={{ width: '100%', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, padding: '10px 14px', color: st.text, fontSize: 14, boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {tests.map(t => (
            <div key={t.key} style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 10, alignItems: 'center' }}>
              <div style={{ background: st.card2, borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ color: st.text, fontSize: 14, fontWeight: 600 }}>{t.icon} {t.label}</div>
                <div style={{ color: st.muted, fontSize: 11, marginTop: 2 }}>Objectif : {t.cible}</div>
              </div>
              <input type="number" step="0.01" value={form[t.key]} onChange={e => setForm(f => ({ ...f, [t.key]: e.target.value }))} placeholder={`${t.placeholder} ${t.unit}`} style={{ width: '100%', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, padding: '10px 14px', color: st.text, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          ))}
        </div>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Notes, ressenti..." style={{ width: '100%', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, padding: '10px 14px', color: st.text, fontSize: 14, resize: 'vertical', boxSizing: 'border-box', marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, color: st.text, cursor: 'pointer' }}>Annuler</button>
          <button onClick={handleSave} disabled={loading} style={{ padding: '10px 20px', background: st.green, border: 'none', borderRadius: 8, color: '#000', fontWeight: 700, cursor: 'pointer' }}>{loading ? '...' : 'Enregistrer'}</button>
        </div>
      </div>
    </div>
  )
}

export default function PrepPhysiqueJoueur({ joueurId }) {
  const [programme, setProgramme] = useState(null)
  const [seances, setSeances] = useState([])
  const [soumissions, setSoumissions] = useState([])
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalSeance, setModalSeance] = useState(null)
  const [showTests, setShowTests] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('programmes_prep').select('*').eq('statut', 'actif').order('created_at', { ascending: false }).limit(1).single()
    if (error?.code === '42P01') { setError('tables_missing'); setLoading(false); return }
    if (!data) { setLoading(false); return }
    setProgramme(data)
    const [s, sub, t] = await Promise.all([
      supabase.from('seances_prep').select('*').eq('programme_id', data.id).order('semaine').order('jour'),
      supabase.from('soumissions_prep').select('*').eq('joueur_id', joueurId),
      supabase.from('tests_physiques').select('*').eq('joueur_id', joueurId).eq('programme_id', data.id).order('date_test', { ascending: false }),
    ])
    setSeances(s.data || [])
    setSoumissions(sub.data || [])
    setTests(t.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [joueurId])

  if (loading) return <div style={{ color: st.muted, textAlign: 'center', padding: 40 }}>Chargement...</div>

  if (error === 'tables_missing') return (
    <div style={{ background: '#1a1a00', border: '1px solid #444', borderRadius: 12, padding: 24 }}>
      <div style={{ color: st.yellow, fontWeight: 700 }}>⚠️ Fonctionnalité en cours d'activation</div>
    </div>
  )

  if (!programme) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: st.muted }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🏋️</div>
      <div style={{ color: st.text, marginBottom: 8 }}>Aucun programme actif</div>
      <div style={{ fontSize: 14 }}>Ton éducateur n'a pas encore créé de programme.</div>
    </div>
  )

  const nbTotal = seances.filter(s => s.type_seance !== 'repos').length
  const nbValides = soumissions.filter(s => s.statut === 'valide').length
  const nbSoumis = soumissions.filter(s => s.statut === 'soumis').length
  const progression = nbTotal > 0 ? Math.round((nbValides / nbTotal) * 100) : 0
  const testActuel = tests[0]

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
          <button onClick={() => setShowTests(true)} style={{ padding: '8px 16px', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, color: st.text, cursor: 'pointer', fontSize: 13 }}>🏆 Mes tests</button>
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
            <span style={{ color: st.yellow, fontSize: 12 }}>⏳ {nbSoumis} en attente</span>
            <span style={{ color: st.muted, fontSize: 12 }}>📋 {nbTotal - nbValides - nbSoumis} à faire</span>
          </div>
        </div>
      </div>

      {/* Grille */}
      {Array.from({ length: programme.nb_semaines || 2 }, (_, i) => i + 1).map(sem => (
        <div key={sem} style={{ marginBottom: 24 }}>
          <h3 style={{ color: st.green, marginBottom: 12, fontSize: 13, fontWeight: 700, letterSpacing: '0.05em' }}>SEMAINE {sem}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
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
      ))}

      {/* Résultats tests */}
      {testActuel && (
        <div style={{ background: st.card, border: `1px solid ${st.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ color: st.text, margin: 0, fontSize: 15 }}>🏆 Tests physiques</h3>
            <span style={{ color: st.muted, fontSize: 12 }}>{new Date(testActuel.date_test).toLocaleDateString('fr-FR')}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {[
              { label: 'CMJ', value: testActuel.cmj_cm, unit: 'cm', cible: 38, gt: true },
              { label: 'Sprint 10m', value: testActuel.sprint_10m, unit: 's', cible: 1.80, gt: false },
              { label: 'Sprint 30m', value: testActuel.sprint_30m, unit: 's', cible: 4.30, gt: false },
              { label: 'Yo-Yo IR1', value: testActuel.yoyo_ir1_m, unit: 'm', cible: 1800, gt: true },
            ].map(t => {
              const atteint = t.value != null ? (t.gt ? t.value >= t.cible : t.value <= t.cible) : null
              return (
                <div key={t.label} style={{ background: st.card2, borderRadius: 8, padding: 12 }}>
                  <div style={{ color: st.muted, fontSize: 11, marginBottom: 4 }}>{t.label}</div>
                  <div style={{ color: atteint === true ? st.green : atteint === false ? st.red : st.muted, fontWeight: 700, fontSize: 20 }}>{t.value != null ? `${t.value}${t.unit}` : '—'}</div>
                  <div style={{ color: st.muted, fontSize: 10 }}>Objectif : {t.gt ? '>' : '<'} {t.cible}{t.unit}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {modalSeance && <ModalSoumettre seance={modalSeance.seance} joueurId={joueurId} soumissionExistante={modalSeance.soumission} onClose={() => setModalSeance(null)} onSaved={async () => { await load(); setModalSeance(null) }} />}
      {showTests && <ModalTests joueurId={joueurId} programmeId={programme.id} testExistant={testActuel} onClose={() => setShowTests(false)} onSaved={async () => { await load(); setShowTests(false) }} />}
    </div>
  )
}
