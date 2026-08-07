import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { t } from '../../lib/translations'

const TYPES_SEANCE = [
  { value: 'course', label: '🏃 Footing / Course', icon: '🏃' },
  { value: 'renforcement', label: '💪 Renforcement', icon: '💪' },
  { value: 'fractionne', label: '⚡ Fractionné', icon: '⚡' },
  { value: 'circuit', label: '🔄 Circuit training', icon: '🔄' },
  { value: 'gainage', label: '🧘 Gainage / Mobilité', icon: '🧘' },
  { value: 'repos', label: '❌ Repos / Étirements', icon: '❌' },
]

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const st = {
  bg: '#0a0a0a', card: '#111', card2: '#1a1a1a', border: '#222',
  green: '#4ade80', text: '#fff', muted: '#888',
  red: '#ef4444', yellow: '#eab308',
}

const getSaison = () => {
  const now = new Date()
  const y = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
  return `${y}-${y + 1}`
}

function ModalCreerProgramme({ onClose, onSave, educateurId }) {
  const [form, setForm] = useState({ titre: '', description: '', date_debut: '', date_fin: '', nb_semaines: 2 })
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!form.titre || !form.date_debut || !form.date_fin) return
    setLoading(true)
    const { data, error } = await supabase.from('programmes_prep').insert({
      educateur_id: educateurId,
      titre: form.titre,
      description: form.description,
      date_debut: form.date_debut,
      date_fin: form.date_fin,
      nb_semaines: form.nb_semaines,
      saison: getSaison(),
      statut: 'actif',
    }).select().single()
    setLoading(false)
    if (!error) onSave(data)
  }

  const inp = { width: '100%', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, padding: '10px 14px', color: st.text, fontSize: 14, boxSizing: 'border-box' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: st.card, border: `1px solid ${st.border}`, borderRadius: 12, padding: 32, width: 480, maxWidth: '90vw' }}>
        <h3 style={{ color: st.text, marginBottom: 24 }}>Créer un programme</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Titre *</label>
            <input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} placeholder="Ex: Pré-reprise U18 R2 2026-2027" style={inp} />
          </div>
          <div>
            <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Instructions générales..." style={{ ...inp, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Date début *</label>
              <input type="date" value={form.date_debut} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Date fin *</label>
              <input type="date" value={form.date_fin} onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))} style={inp} />
            </div>
          </div>
          <div>
            <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Nombre de semaines</label>
            <select value={form.nb_semaines} onChange={e => setForm(f => ({ ...f, nb_semaines: parseInt(e.target.value) }))} style={inp}>
              {[1, 2, 3, 4, 6, 8].map(n => <option key={n} value={n}>{n} semaine{n > 1 ? 's' : ''}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, color: st.text, cursor: 'pointer' }}>Annuler</button>
          <button onClick={handleSave} disabled={loading} style={{ padding: '10px 20px', background: st.green, border: 'none', borderRadius: 8, color: '#000', fontWeight: 700, cursor: 'pointer' }}>{loading ? '...' : 'Créer'}</button>
        </div>
      </div>
    </div>
  )
}

function ModalSeance({ seance, programmeId, semaine, jour, onClose, onSave }) {
  const [form, setForm] = useState(seance || { type_seance: 'course', titre: '', description: '', duree_cible: '', distance_cible: '', semaine, jour })
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!form.titre) return
    setLoading(true)
    const payload = { programme_id: programmeId, semaine: form.semaine, jour: form.jour, type_seance: form.type_seance, titre: form.titre, description: form.description, duree_cible: form.duree_cible ? parseInt(form.duree_cible) : null, distance_cible: form.distance_cible ? parseFloat(form.distance_cible) : null }
    const { error } = seance?.id
      ? await supabase.from('seances_prep').update(payload).eq('id', seance.id)
      : await supabase.from('seances_prep').insert(payload)
    setLoading(false)
    if (!error) onSave()
  }

  const inp = { width: '100%', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, padding: '10px 14px', color: st.text, fontSize: 14, boxSizing: 'border-box' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: st.card, border: `1px solid ${st.border}`, borderRadius: 12, padding: 32, width: 480, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ color: st.text, marginBottom: 24 }}>{seance ? 'Modifier' : `Séance S${semaine} J${jour}`}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Type</label>
            <select value={form.type_seance} onChange={e => setForm(f => ({ ...f, type_seance: e.target.value }))} style={inp}>
              {TYPES_SEANCE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Titre *</label>
            <input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} placeholder="Ex: Footing 35 min + gainage" style={inp} />
          </div>
          <div>
            <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Consignes</label>
            <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...inp, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Durée cible (min)</label>
              <input type="number" value={form.duree_cible || ''} onChange={e => setForm(f => ({ ...f, duree_cible: e.target.value }))} placeholder="35" style={inp} />
            </div>
            <div>
              <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Distance cible (km)</label>
              <input type="number" step="0.1" value={form.distance_cible || ''} onChange={e => setForm(f => ({ ...f, distance_cible: e.target.value }))} placeholder="5.0" style={inp} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, color: st.text, cursor: 'pointer' }}>Annuler</button>
          <button onClick={handleSave} disabled={loading} style={{ padding: '10px 20px', background: st.green, border: 'none', borderRadius: 8, color: '#000', fontWeight: 700, cursor: 'pointer' }}>{loading ? '...' : 'Enregistrer'}</button>
        </div>
      </div>
    </div>
  )
}

function ModalSoumission({ soumission, joueurNom, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: st.card, border: `1px solid ${st.border}`, borderRadius: 12, padding: 32, width: 520, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ color: st.text, marginBottom: 4 }}>Soumission de {joueurNom}</h3>
        <p style={{ color: st.muted, fontSize: 13, marginBottom: 24 }}>Soumis le {new Date(soumission.created_at).toLocaleDateString('fr-FR')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {soumission.duree_reelle && <div style={{ background: st.card2, borderRadius: 8, padding: 12 }}><div style={{ color: st.muted, fontSize: 11, marginBottom: 4 }}>DURÉE</div><div style={{ color: st.text, fontWeight: 700 }}>{soumission.duree_reelle} min</div></div>}
          {soumission.distance_reelle && <div style={{ background: st.card2, borderRadius: 8, padding: 12 }}><div style={{ color: st.muted, fontSize: 11, marginBottom: 4 }}>DISTANCE</div><div style={{ color: st.text, fontWeight: 700 }}>{soumission.distance_reelle} km</div></div>}
          {soumission.allure && <div style={{ background: st.card2, borderRadius: 8, padding: 12 }}><div style={{ color: st.muted, fontSize: 11, marginBottom: 4 }}>ALLURE</div><div style={{ color: st.text, fontWeight: 700 }}>{soumission.allure} /km</div></div>}
          {soumission.calories && <div style={{ background: st.card2, borderRadius: 8, padding: 12 }}><div style={{ color: st.muted, fontSize: 11, marginBottom: 4 }}>CALORIES</div><div style={{ color: st.text, fontWeight: 700 }}>{soumission.calories} kcal</div></div>}
          {soumission.fc_moyenne && <div style={{ background: st.card2, borderRadius: 8, padding: 12 }}><div style={{ color: st.muted, fontSize: 11, marginBottom: 4 }}>FC MOYENNE</div><div style={{ color: st.text, fontWeight: 700 }}>{soumission.fc_moyenne} bpm</div></div>}
          {soumission.rpe && <div style={{ background: st.card2, borderRadius: 8, padding: 12 }}><div style={{ color: st.muted, fontSize: 11, marginBottom: 4 }}>RPE</div><div style={{ color: st.text, fontWeight: 700 }}>{soumission.rpe}/10</div></div>}
        </div>
        {soumission.notes && <div style={{ background: st.card2, borderRadius: 8, padding: 12, marginBottom: 16 }}><div style={{ color: st.muted, fontSize: 11, marginBottom: 4 }}>NOTES</div><div style={{ color: st.text, fontSize: 14 }}>{soumission.notes}</div></div>}
        {soumission.proof_url && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: st.muted, fontSize: 12, marginBottom: 8 }}>CAPTURE D'ÉCRAN</div>
            <img src={soumission.proof_url} alt="Preuve" style={{ width: '100%', borderRadius: 8, border: `1px solid ${st.border}` }} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, color: st.text, cursor: 'pointer' }}>Fermer</button>
        </div>
      </div>
    </div>
  )
}

function NavBarVues({ vue, programmeTitre, onBack, onSuivi, onStats, onClassement }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <button onClick={onBack} style={{ background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, padding: '8px 16px', color: st.text, cursor: 'pointer', fontSize: 13 }}>← Programme</button>
        <span style={{ flex: 1, minWidth: 0, color: st.muted, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{programmeTitre}</span>
      </div>
      <div style={{ display: 'flex', gap: 6, background: st.card2, borderRadius: 10, padding: 4 }}>
        {[
          { key: 'suivi', label: '📋 Suivi', fn: onSuivi },
          { key: 'stats', label: '📊 Stats', fn: onStats },
          { key: 'classement', label: '🏆 Classement', fn: onClassement },
        ].map(tab => (
          <button key={tab.key} onClick={tab.fn}
            style={{ flex: 1, padding: '9px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              background: vue === tab.key ? st.green : 'transparent',
              color: vue === tab.key ? '#000' : st.muted, transition: 'all 0.15s' }}>
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function GestionPrepPhysique({ educateurId, clubId, readOnly = false, isMobile = false, lang = 'fr' }) {
  const [vue, setVue] = useState('programmes')
  const [programmes, setProgrammes] = useState([])
  const [selectedProgramme, setSelectedProgramme] = useState(null)
  const [seances, setSeances] = useState([])
  const [soumissions, setSoumissions] = useState([])
  const [joueurs, setJoueurs] = useState([])
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreerProgramme, setShowCreerProgramme] = useState(false)
  const [modalSeance, setModalSeance] = useState(null)
  const [modalSoumission, setModalSoumission] = useState(null)
  const [scanLoading, setScanLoading] = useState(false)
  const [scanResultat, setScanResultat] = useState(null)
  const [joueurOuvert, setJoueurOuvert] = useState(null) // id du joueur déplié dans l'onglet Stats
  const [testForm, setTestForm] = useState({ joueur_id: '', date_test: new Date().toISOString().split('T')[0], cmj_cm: '', sprint_10m_s: '', sprint_30m_s: '', test_30_15_kmh: '', notes: '' })
  const [savingTest, setSavingTest] = useState(false)

  const loadProgrammes = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('programmes_prep').select('*').eq('educateur_id', educateurId).order('created_at', { ascending: false })
    if (error?.code === '42P01') { setError('tables_missing'); setLoading(false); return }
    setProgrammes(data || [])
    setLoading(false)
  }

  useEffect(() => { loadProgrammes() }, [])

  const loadSeances = async (programmeId) => {
    const { data } = await supabase.from('seances_prep').select('*').eq('programme_id', programmeId).order('semaine').order('jour')
    setSeances(data || [])
  }

  const loadSoumissions = async (programmeId) => {
    const { data: seancesData } = await supabase.from('seances_prep').select('id').eq('programme_id', programmeId)
    const ids = (seancesData || []).map(s => s.id)
    if (!ids.length) { setSoumissions([]); return }
    const { data } = await supabase.from('soumissions_prep').select('*').in('seance_id', ids).order('created_at', { ascending: false })
    setSoumissions(data || [])
  }

  const loadJoueurs = async () => {
    // Seuls les joueurs affiliés (statut='accepte') à cet éducateur — pas tous les
    // comptes pro/fan de la plateforme. Même chemin que PrepPhysiqueJoueur/GestionCloturesSaison.
    const { data } = await supabase
      .from('affiliations')
      .select('profiles!affiliations_joueur_id_fkey(id, nom, prenom)')
      .eq('educateur_id', educateurId)
      .eq('statut', 'accepte')
    setJoueurs((data || []).map(a => a.profiles).filter(Boolean))
  }

  // Les tests physiques ne sont plus scopés à un programme (colonne
  // tests_physiques.programme_id supprimée) — chargés pour tout le roster de
  // cet éducateur, réutilisés à la fois par le classement (dans un programme)
  // et par l'onglet autonome "Tests physiques".
  const loadTests = async () => {
    const { data } = await supabase.from('tests_physiques').select('*, joueur:profiles!joueur_id(id, nom, prenom)').eq('educateur_id', educateurId).order('date_test', { ascending: false })
    setTests(data || [])
  }

  const ouvrirProgramme = async (p) => {
    setSelectedProgramme(p); setVue('detail')
    await Promise.all([loadSeances(p.id), loadJoueurs()])
  }

  // Vue autonome, pas liée à un programme (contrairement aux vues detail/
  // suivi/stats/classement, qui nécessitent selectedProgramme).
  const ouvrirTests = async () => {
    setVue('tests')
    await Promise.all([loadJoueurs(), loadTests()])
  }

  const objectifsTests = {
    cmj_cm: { label: 'CMJ — Saut vertical', unit: 'cm', cible: 38, gt: true, placeholder: '38' },
    sprint_10m_s: { label: 'Sprint 10m', unit: 's', cible: 1.80, gt: false, placeholder: '1.80' },
    sprint_30m_s: { label: 'Sprint 30m', unit: 's', cible: 4.30, gt: false, placeholder: '4.30' },
    test_30_15_kmh: { label: '30-15 IFT (VIFT)', unit: ' km/h', cible: 18, gt: true, placeholder: '18.5' },
  }

  const objectifAtteint = (cle, valeur) => {
    if (valeur === '' || valeur == null) return null
    const o = objectifsTests[cle]
    const v = parseFloat(valeur)
    return o.gt ? v >= o.cible : v <= o.cible
  }

  const enregistrerTest = async () => {
    if (!testForm.joueur_id || !testForm.date_test) return
    setSavingTest(true)
    const payload = {
      joueur_id: testForm.joueur_id,
      educateur_id: educateurId,
      club_id: clubId || null,
      date_test: testForm.date_test,
      cmj_cm: testForm.cmj_cm !== '' ? parseFloat(testForm.cmj_cm) : null,
      sprint_10m_s: testForm.sprint_10m_s !== '' ? parseFloat(testForm.sprint_10m_s) : null,
      sprint_30m_s: testForm.sprint_30m_s !== '' ? parseFloat(testForm.sprint_30m_s) : null,
      test_30_15_kmh: testForm.test_30_15_kmh !== '' ? parseFloat(testForm.test_30_15_kmh) : null,
      notes: testForm.notes.trim() || null,
    }
    const { error } = await supabase.from('tests_physiques').insert(payload)
    setSavingTest(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setTestForm({ joueur_id: '', date_test: new Date().toISOString().split('T')[0], cmj_cm: '', sprint_10m_s: '', sprint_30m_s: '', test_30_15_kmh: '', notes: '' })
    await loadTests()
  }

  const ouvrirSuivi = async () => {
    setVue('suivi')
    await loadSoumissions(selectedProgramme.id)
  }

  const ouvrirClassement = async () => {
    setVue('classement')
    await Promise.all([loadSoumissions(selectedProgramme.id), loadTests(), loadJoueurs()])
  }

  const ouvrirStats = async () => {
    setVue('stats')
    await loadSoumissions(selectedProgramme.id)
  }

  const supprimerSeance = async (seanceId) => {
    if (!confirm('Supprimer cette séance ?')) return
    await supabase.from('seances_prep').delete().eq('id', seanceId)
    await loadSeances(selectedProgramme.id)
  }

  const supprimerProgramme = async (progId) => {
    if (!confirm('Supprimer ce programme et toutes ses séances ?')) return
    await supabase.from('seances_prep').delete().eq('programme_id', progId)
    await supabase.from('programmes_prep').delete().eq('id', progId)
    await loadProgrammes()
  }

  const handleScanProgramme = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setScanLoading(true)

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result.split(',')[1]

      const { data, error } = await supabase.functions.invoke('scan-programme', {
        body: { imageBase64: base64, mimeType: file.type },
      })

      setScanLoading(false)
      if (error || data?.error) {
        alert('Erreur lors du scan : ' + (error?.message || data?.error))
        return
      }
      setScanResultat(data.programme)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Jours 1-indexés (lundi=1 … dimanche=7), pour matcher la grille (jour = ji + 1
  // dans la vue Détail) — pas d'index 0, sinon les séances du lundi n'apparaîtraient
  // jamais et les autres jours seraient décalés d'une case.
  const JOUR_INDEX = { lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 7 }

  const confirmerScanProgramme = async () => {
    if (!scanResultat) return
    // Le scan ne donne que des semaines relatives (S1, S2...), pas de vraies dates :
    // on démarre le programme aujourd'hui pour nb_semaines.
    const dateDebut = new Date()
    const dateFin = new Date(dateDebut.getTime() + (scanResultat.nb_semaines || 1) * 7 * 24 * 60 * 60 * 1000)
    const { data: prog, error } = await supabase.from('programmes_prep').insert({
      educateur_id: educateurId,
      titre: scanResultat.titre,
      saison: getSaison(),
      nb_semaines: scanResultat.nb_semaines,
      date_debut: dateDebut.toISOString().split('T')[0],
      date_fin: dateFin.toISOString().split('T')[0],
      statut: 'actif',
    }).select().single()

    if (error) { alert('Erreur création programme : ' + error.message); return }

    const seances = []
    for (const sem of scanResultat.semaines) {
      for (const j of sem.jours) {
        if (!j.repos && j.exercice) {
          seances.push({
            programme_id: prog.id,
            semaine: sem.numero,
            jour: JOUR_INDEX[j.jour] ?? 1,
            type_seance: j.type || 'course',
            titre: j.exercice,
            description: j.exercice,
          })
        }
      }
    }

    if (seances.length > 0) {
      const { error: errSeances } = await supabase.from('seances_prep').insert(seances)
      if (errSeances) { alert('Programme créé, mais erreur sur les séances : ' + errSeances.message) }
    }

    setScanResultat(null)
    setProgrammes(prev => [prog, ...prev])
    alert('✅ Programme créé avec succès !')
  }

  const getClassement = () => {
    const nbTotal = seances.filter(s => s.type_seance !== 'repos').length
    return joueurs.map(j => {
      const sj = soumissions.filter(s => s.joueur_id === j.id)
      const validees = sj.filter(s => s.statut === 'valide').length
      const taux = nbTotal > 0 ? Math.round((validees / nbTotal) * 100) : 0
      const points = sj.reduce((acc, s) => acc + (s.bonus ? 2 : 1), 0)
      const nbBonus = sj.filter(s => s.bonus).length
      const t = tests.find(t => t.joueur_id === j.id)
      return { ...j, validees, total: nbTotal, taux, points, nbBonus, cmj: t?.cmj_cm, s10: t?.sprint_10m_s, s30: t?.sprint_30m_s, ift: t?.test_30_15_kmh }
    }).sort((a, b) => b.points - a.points)
  }

  const joueurAFait = (joueurId, seanceId) =>
    soumissions.some(s => s.joueur_id === joueurId && s.seance_id === seanceId)

  const getSoumission = (joueurId, seanceId) =>
    soumissions.find(s => s.joueur_id === joueurId && s.seance_id === seanceId)

  if (loading) return <div style={{ color: st.muted, textAlign: 'center', padding: 40 }}>{t('btn_chargement', lang)}</div>

  if (error === 'tables_missing') return (
    <div style={{ background: '#1a1a00', border: '1px solid #444', borderRadius: 12, padding: 24, margin: 16 }}>
      <div style={{ color: st.yellow, fontWeight: 700, marginBottom: 8 }}>⚠️ {t('phys_migration_requise', lang)}</div>
      <div style={{ color: st.muted, fontSize: 14 }}>{t('phys_lance_migration', lang)}</div>
    </div>
  )

  // VUE PROGRAMMES
  if (vue === 'programmes') return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: st.text, margin: 0 }}>🏋️ {t('phys_titre', lang)}</h2>
          <p style={{ color: st.muted, fontSize: 14, margin: '4px 0 0' }}>{t('phys_programmes_joueurs', lang)}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={ouvrirTests} style={{ padding: '10px 20px', background: '#1a1a1a', border: `1px solid ${st.border}`, borderRadius: 8, color: st.text, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🏃 Tests physiques</button>
          {!readOnly && (
            <>
              <label style={{
                padding: '10px 20px', background: '#1a1a1a', border: `1px solid ${st.green}`,
                borderRadius: 10, color: st.green, fontWeight: 700, fontSize: 13,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                📷 {t('phys_scanner_programme', lang)}
                <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }}
                  onChange={handleScanProgramme} disabled={scanLoading} />
              </label>
              <button onClick={() => setShowCreerProgramme(true)} style={{ padding: '10px 20px', background: st.green, border: 'none', borderRadius: 8, color: '#000', fontWeight: 700, cursor: 'pointer' }}>+ {t('phys_nouveau_programme', lang)}</button>
            </>
          )}
        </div>
      </div>
      {readOnly && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#60a5fa15', border: '1px solid #60a5fa30', color: '#60a5fa', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, marginBottom: 16 }}>
          👁 {t('equipe_mode_lecture', lang)}
        </div>
      )}
      {programmes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: st.muted }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏋️</div>
          <div style={{ color: st.text, marginBottom: 8 }}>{t('phys_aucun_programme', lang)}</div>
          <div style={{ fontSize: 14 }}>{t('phys_creer_premier', lang)}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {programmes.map(p => (
            <div key={p.id} onClick={() => ouvrirProgramme(p)} style={{ background: st.card, border: `1px solid ${st.border}`, borderRadius: 12, padding: 20, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = st.green}
              onMouseLeave={e => e.currentTarget.style.borderColor = st.border}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: st.text, fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{p.titre}</div>
                  {p.description && <div style={{ color: st.muted, fontSize: 13, marginBottom: 8 }}>{p.description}</div>}
                  <div style={{ color: st.muted, fontSize: 12 }}>📅 {new Date(p.date_debut).toLocaleDateString('fr-FR')} → {new Date(p.date_fin).toLocaleDateString('fr-FR')} · {p.nb_semaines} semaine{p.nb_semaines > 1 ? 's' : ''}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <span style={{ background: p.statut === 'actif' ? '#14532d' : st.card2, color: p.statut === 'actif' ? st.green : st.muted, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {p.statut === 'actif' ? `● ${t('phys_actif', lang)}` : t('phys_termine', lang)}
                  </span>
                  {!readOnly && (
                    <button onClick={e => { e.stopPropagation(); supprimerProgramme(p.id) }}
                      style={{ padding: '6px 12px', background: '#2a0a0a', border: '1px solid #5a1a1a', borderRadius: 6, color: st.red, cursor: 'pointer', fontSize: 12 }}>
                      🗑 Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {showCreerProgramme && (
        <ModalCreerProgramme educateurId={educateurId} onClose={() => setShowCreerProgramme(false)}
          onSave={(p) => { setProgrammes(prev => [p, ...prev]); setShowCreerProgramme(false); ouvrirProgramme(p) }} />
      )}

      {scanResultat && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#111', borderRadius: 16, padding: 32,
            width: 600, maxWidth: '95vw', maxHeight: '80vh', overflowY: 'auto', border: `1px solid ${st.border}`,
          }}>
            <h2 style={{ color: st.green, marginBottom: 8 }}>
              ✅ Programme détecté : {scanResultat.titre}
            </h2>
            <p style={{ color: st.muted, marginBottom: 24 }}>
              {scanResultat.nb_semaines} semaine(s) • Vérifiez avant de confirmer
            </p>

            {scanResultat.semaines.map(sem => (
              <div key={sem.numero} style={{ marginBottom: 20 }}>
                <div style={{ color: st.green, fontWeight: 700, marginBottom: 10 }}>
                  SEMAINE {sem.numero}
                </div>
                {sem.jours.map(j => (
                  <div key={j.jour} style={{
                    display: 'flex', gap: 12, padding: '8px 12px',
                    background: j.repos ? '#0a0a0a' : st.card2,
                    borderRadius: 8, marginBottom: 4,
                  }}>
                    <span style={{ color: st.muted, width: 80, textTransform: 'capitalize' }}>
                      {j.jour}
                    </span>
                    <span style={{ color: j.repos ? '#444' : st.text }}>
                      {j.repos ? '— Repos' : j.exercice}
                    </span>
                  </div>
                ))}
              </div>
            ))}

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                onClick={confirmerScanProgramme}
                style={{
                  flex: 1, padding: 14, background: st.green, border: 'none',
                  borderRadius: 10, color: '#000', fontWeight: 800, cursor: 'pointer',
                }}>
                ✅ Confirmer et remplir la grille
              </button>
              <button
                onClick={() => setScanResultat(null)}
                style={{
                  padding: '14px 24px', background: st.card2, border: `1px solid ${st.border}`,
                  borderRadius: 10, color: st.text, cursor: 'pointer',
                }}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {scanLoading && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
        }}>
          <div style={{ color: st.green, fontSize: 18, fontWeight: 700 }}>
            🔍 Analyse du programme en cours...
          </div>
        </div>
      )}
    </div>
  )

  // VUE TESTS PHYSIQUES — autonome, pas liée à un programme
  if (vue === 'tests') return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ color: st.text, margin: 0 }}>🏃 Tests physiques</h2>
        <button onClick={() => setVue('programmes')} style={{ padding: '8px 16px', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, color: st.text, cursor: 'pointer', fontSize: 13 }}>← Retour</button>
      </div>

      {!readOnly && (
        <div style={{ background: st.card, border: `1px solid ${st.border}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <h3 style={{ color: st.text, margin: '0 0 16px', fontSize: 15 }}>Nouveau test</h3>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Joueur</label>
              <select value={testForm.joueur_id} onChange={e => setTestForm(f => ({ ...f, joueur_id: e.target.value }))}
                style={{ width: '100%', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, padding: '10px 14px', color: st.text, fontSize: 14, boxSizing: 'border-box' }}>
                <option value="">— Choisir —</option>
                {joueurs.map(j => <option key={j.id} value={j.id}>{j.prenom} {j.nom}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Date du test</label>
              <input type="date" value={testForm.date_test} onChange={e => setTestForm(f => ({ ...f, date_test: e.target.value }))}
                style={{ width: '100%', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, padding: '10px 14px', color: st.text, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
            {Object.entries(objectifsTests).map(([cle, o]) => {
              const atteint = objectifAtteint(cle, testForm[cle])
              return (
                <div key={cle}>
                  <label style={{ color: st.muted, fontSize: 11, display: 'block', marginBottom: 6 }}>{o.label} ({o.unit})</label>
                  <input type="number" step="0.01" value={testForm[cle]} onChange={e => setTestForm(f => ({ ...f, [cle]: e.target.value }))}
                    placeholder={`Objectif : ${o.gt ? '≥' : '≤'} ${o.placeholder}`}
                    style={{ width: '100%', background: st.card2, border: `1px solid ${atteint === true ? st.green : atteint === false ? st.red : st.border}`, borderRadius: 8, padding: '10px 14px', color: st.text, fontSize: 14, boxSizing: 'border-box' }} />
                  {atteint != null && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: atteint ? st.green : st.red }}>{atteint ? '✅ Objectif atteint' : '❌ Objectif non atteint'}</span>
                  )}
                </div>
              )
            })}
          </div>
          <label style={{ color: st.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Notes / ressenti</label>
          <textarea value={testForm.notes} onChange={e => setTestForm(f => ({ ...f, notes: e.target.value }))} rows={2}
            style={{ width: '100%', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, padding: '10px 14px', color: st.text, fontSize: 14, resize: 'vertical', boxSizing: 'border-box', marginBottom: 16 }} />
          <button onClick={enregistrerTest} disabled={savingTest || !testForm.joueur_id || !testForm.date_test}
            style={{ padding: '10px 24px', background: st.green, border: 'none', borderRadius: 8, color: '#000', fontWeight: 700, cursor: 'pointer', opacity: (savingTest || !testForm.joueur_id || !testForm.date_test) ? 0.5 : 1 }}>
            {savingTest ? 'Enregistrement...' : '💾 Enregistrer'}
          </button>
        </div>
      )}

      <h3 style={{ color: st.text, margin: '0 0 12px', fontSize: 15 }}>Historique de l'équipe</h3>
      {tests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, color: st.muted, background: st.card, border: `1px solid ${st.border}`, borderRadius: 12 }}>Aucun test enregistré pour le moment.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${st.border}` }}>
                {['Date', 'Joueur', 'CMJ', 'Sprint 10m', 'Sprint 30m', '30-15 IFT', 'Notes'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: st.muted, fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tests.map(test => (
                <tr key={test.id} style={{ borderBottom: `1px solid ${st.border}` }}>
                  <td style={{ padding: '8px 10px', color: st.text, whiteSpace: 'nowrap' }}>{new Date(test.date_test).toLocaleDateString('fr-FR')}</td>
                  <td style={{ padding: '8px 10px', color: st.text, whiteSpace: 'nowrap' }}>{test.joueur ? `${test.joueur.prenom} ${test.joueur.nom}` : '—'}</td>
                  {['cmj_cm', 'sprint_10m_s', 'sprint_30m_s', 'test_30_15_kmh'].map(cle => {
                    const valeur = test[cle]
                    const atteint = objectifAtteint(cle, valeur)
                    return (
                      <td key={cle} style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                        {valeur != null ? (
                          <span style={{ color: atteint ? st.green : st.red, fontWeight: 600 }}>
                            {atteint ? '✅' : '❌'} {valeur}{objectifsTests[cle].unit}
                          </span>
                        ) : <span style={{ color: st.muted }}>—</span>}
                      </td>
                    )
                  })}
                  <td style={{ padding: '8px 10px', color: st.muted, fontStyle: 'italic', maxWidth: 200 }}>{test.notes || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  // VUE DETAIL (grille semaines/jours)
  if (vue === 'detail') {
    const nbSemaines = selectedProgramme.nb_semaines || 2
    return (
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => setVue('programmes')} style={{ background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, padding: '8px 16px', color: st.text, cursor: 'pointer' }}>← {t('phys_retour', lang)}</button>
          <h2 style={{ color: st.text, margin: 0, fontSize: isMobile ? 16 : 18, flex: isMobile ? 'none' : 1 }}>{selectedProgramme.titre}</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={ouvrirSuivi} style={{ padding: '8px 16px', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, color: st.text, cursor: 'pointer' }}>📋 {t('phys_suivi', lang)}</button>
            <button onClick={ouvrirStats} style={{ padding: '8px 16px', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, color: st.text, cursor: 'pointer' }}>📊 {t('nav_stats', lang)}</button>
            <button onClick={ouvrirClassement} style={{ padding: '8px 16px', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, color: st.text, cursor: 'pointer' }}>🏆 {t('phys_classement', lang)}</button>
          </div>
        </div>
        {Array.from({ length: nbSemaines }, (_, i) => i + 1).map(sem => (
          <div key={sem} style={{ marginBottom: 24 }}>
            <h3 style={{ color: st.green, marginBottom: 12, fontSize: 13, fontWeight: 700, letterSpacing: '0.05em' }}>SEMAINE {sem}</h3>
            <div style={{ overflowX: isMobile ? 'auto' : 'visible', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(110px, 1fr))', gap: 8, minWidth: isMobile ? 770 : 'auto' }}>
                {JOURS.map((jourLabel, ji) => {
                  const jour = ji + 1
                  const seance = seances.find(s => s.semaine === sem && s.jour === jour)
                  const typeInfo = TYPES_SEANCE.find(t => t.value === seance?.type_seance) || TYPES_SEANCE[0]
                  const isRepos = seance?.type_seance === 'repos'
                  return (
                    <div key={jour}>
                      <div style={{ color: st.muted, fontSize: isMobile ? 11 : 13, textAlign: 'center', marginBottom: 4, fontWeight: 600 }}>{jourLabel}</div>
                      <div onClick={() => !readOnly && setModalSeance({ semaine: sem, jour, seance })}
                        style={{ background: seance ? (isRepos ? '#1a1a1a' : '#0a1a0a') : st.card, border: `1px solid ${seance ? (isRepos ? '#333' : st.green) : st.border}`, borderRadius: 8, padding: 10, minHeight: 80, cursor: readOnly ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, opacity: isRepos ? 0.5 : 1 }}
                        onMouseEnter={e => { if (!readOnly) e.currentTarget.style.borderColor = st.green }}
                        onMouseLeave={e => e.currentTarget.style.borderColor = seance ? (isRepos ? '#333' : st.green) : st.border}>
                        {seance ? (
                          <>
                            <div style={{ fontSize: 20 }}>{typeInfo.icon}</div>
                            <div style={{ color: st.text, fontSize: 10, textAlign: 'center', lineHeight: 1.3 }}>{seance.titre}</div>
                            {seance.duree_cible && <div style={{ color: st.muted, fontSize: 10 }}>{seance.duree_cible}min</div>}
                          </>
                        ) : !readOnly && <div style={{ color: st.border, fontSize: 20 }}>+</div>}
                      </div>
                      {seance && !readOnly && <button onClick={e => { e.stopPropagation(); supprimerSeance(seance.id) }} style={{ width: '100%', marginTop: 3, background: 'transparent', border: 'none', color: st.muted, fontSize: 10, cursor: 'pointer' }}>suppr.</button>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
        {modalSeance && <ModalSeance {...modalSeance} programmeId={selectedProgramme.id} onClose={() => setModalSeance(null)} onSave={async () => { await loadSeances(selectedProgramme.id); setModalSeance(null) }} />}
      </div>
    )
  }

  // VUE SUIVI — tableau fait/pas fait (aucune validation requise : une soumission = fait)
  if (vue === 'suivi') {
    const seancesActives = seances.filter(s => s.type_seance !== 'repos')
    return (
      <div style={{ padding: 16 }}>
        <NavBarVues vue={vue} programmeTitre={selectedProgramme?.titre} onBack={() => setVue('detail')} onSuivi={ouvrirSuivi} onStats={ouvrirStats} onClassement={ouvrirClassement} />
        {joueurs.length === 0 || seancesActives.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: st.muted }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
            <div style={{ color: st.text, marginBottom: 8 }}>{joueurs.length === 0 ? t('phys_aucun_joueur_affilie', lang) : t('phys_aucune_seance_prog', lang)}</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ color: st.muted, textAlign: 'left', padding: 8 }}>Joueur</th>
                  {seancesActives.map(s => (
                    <th key={s.id} style={{ color: st.muted, textAlign: 'center', padding: 8, fontSize: 11, whiteSpace: 'nowrap' }}>
                      S{s.semaine} {['L', 'M', 'Me', 'J', 'V', 'S', 'D'][s.jour - 1]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {joueurs.map(j => (
                  <tr key={j.id} style={{ borderTop: `1px solid ${st.border}` }}>
                    <td style={{ padding: '10px 8px', color: st.text, fontWeight: 600, whiteSpace: 'nowrap' }}>{j.prenom} {j.nom}</td>
                    {seancesActives.map(s => {
                      const fait = joueurAFait(j.id, s.id)
                      const sub = fait ? getSoumission(j.id, s.id) : null
                      return (
                        <td key={s.id} style={{ textAlign: 'center', padding: 8 }}>
                          {fait ? (
                            <button onClick={() => setModalSoumission({ soumission: sub, joueurNom: `${j.prenom} ${j.nom}` })}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, margin: '0 auto' }}>
                              <span style={{ color: st.green, fontSize: 16 }}>✅</span>
                              {sub?.proof_url && <span style={{ color: st.green, fontSize: 10 }}>📎</span>}
                            </button>
                          ) : <span style={{ color: st.border, fontSize: 16 }}>—</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {modalSoumission && <ModalSoumission {...modalSoumission} onClose={() => setModalSoumission(null)} />}
      </div>
    )
  }

  // VUE STATS
  if (vue === 'stats') {
    return (
      <div style={{ padding: 16 }}>
        <NavBarVues vue={vue} programmeTitre={selectedProgramme?.titre} onBack={() => setVue('detail')} onSuivi={ouvrirSuivi} onStats={ouvrirStats} onClassement={ouvrirClassement} />
        {joueurs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: st.muted }}>{t('phys_aucun_joueur_affilie', lang)}</div>
        ) : (
          joueurs.map(j => {
            const soumJ = soumissions.filter(s => s.joueur_id === j.id)
            const distTotal = soumJ.reduce((acc, s) => acc + (s.distance_reelle || 0), 0)
            const dureeTotal = soumJ.reduce((acc, s) => acc + (s.duree_reelle || 0), 0)
            const allureMoy = distTotal > 0 ? (dureeTotal / distTotal).toFixed(1) : '—'
            const ouvert = joueurOuvert === j.id
            return (
              <div key={j.id} style={{ background: st.card2, borderRadius: 10, marginBottom: 8, overflow: 'hidden' }}>
                <button onClick={() => setJoueurOuvert(ouvert ? null : j.id)}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: 16, background: 'none', border: 'none', cursor: 'pointer', flexWrap: 'wrap' }}>
                  <span style={{ color: st.text, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{ouvert ? '▼' : '▶'}</span> {j.prenom} {j.nom}
                  </span>
                  <span style={{ color: st.muted, fontSize: 13 }}>✅ {soumJ.length} séances</span>
                </button>
                {ouvert && (
                  <div>
                    <div style={{ display: 'flex', gap: 20, color: st.muted, fontSize: 13, flexWrap: 'wrap', padding: '0 16px 12px' }}>
                      <span>🏃 {distTotal.toFixed(1)} km</span>
                      <span>⏱ {dureeTotal} min</span>
                      <span>📈 {allureMoy} min/km</span>
                    </div>
                    {soumJ.length === 0 ? (
                      <div style={{ padding: '8px 16px 16px', color: st.border, fontSize: 13 }}>{t('phys_aucune_seance_soumise', lang)}</div>
                    ) : soumJ.map(s => {
                      const seance = seances.find(se => se.id === s.seance_id)
                      return (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderTop: `1px solid ${st.border}`, flexWrap: 'wrap', gap: 8 }}>
                          <span style={{ color: '#ccc', fontSize: 13 }}>{seance?.titre || 'Séance'}</span>
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 13 }}>
                            <span style={{ color: st.muted }}>{s.distance_reelle ? `${s.distance_reelle} km` : '—'}</span>
                            <span style={{ color: st.muted }}>{s.duree_reelle ? `${s.duree_reelle} min` : '—'}</span>
                            <a href={s.proof_url || '#'} target={s.proof_url ? '_blank' : '_self'} rel="noreferrer"
                              onClick={!s.proof_url ? e => e.preventDefault() : undefined}
                              style={{ padding: '3px 10px', background: st.bg, border: `1px solid ${s.proof_url ? st.green : '#333'}`, borderRadius: 6, color: s.proof_url ? st.green : '#444', fontSize: 12, textDecoration: 'none', cursor: s.proof_url ? 'pointer' : 'default' }}>
                              📎 {s.proof_url ? 'Voir' : 'Aucun'}
                            </a>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    )
  }

  // VUE CLASSEMENT
  if (vue === 'classement') {
    const classement = getClassement()
    return (
      <div style={{ padding: 16 }}>
        <NavBarVues vue={vue} programmeTitre={selectedProgramme?.titre} onBack={() => setVue('detail')} onSuivi={ouvrirSuivi} onStats={ouvrirStats} onClassement={ouvrirClassement} />
        <div style={{ background: st.card, border: `1px solid ${st.border}`, borderRadius: 12, overflow: 'hidden', overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 70px 90px 65px 65px 65px 65px 70px', padding: '12px 16px', background: st.card2, color: st.muted, fontSize: 11, fontWeight: 700, gap: 8 }}>
            <div>#</div><div>JOUEUR</div><div style={{ textAlign: 'center' }}>POINTS</div><div style={{ textAlign: 'center' }}>RÉGULARITÉ</div>
            <div style={{ textAlign: 'center' }}>BONUS</div>
            <div style={{ textAlign: 'center' }}>CMJ</div><div style={{ textAlign: 'center' }}>10m</div>
            <div style={{ textAlign: 'center' }}>30m</div><div style={{ textAlign: 'center' }}>30-15</div>
          </div>
          {classement.map((j, idx) => (
            <div key={j.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 70px 90px 65px 65px 65px 65px 70px', padding: '12px 16px', borderTop: `1px solid ${st.border}`, gap: 8, alignItems: 'center', background: idx === 0 ? '#0a1a0a' : 'transparent' }}>
              <div style={{ color: idx === 0 ? st.green : st.muted, fontWeight: 700 }}>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}</div>
              <div style={{ color: st.text, fontWeight: idx < 3 ? 700 : 400 }}>{j.full_name || `${j.prenom || ''} ${j.nom || ''}`}</div>
              <div style={{ textAlign: 'center', color: st.green, fontWeight: 800 }}>{j.points} pts</div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ color: j.taux >= 80 ? st.green : j.taux >= 50 ? st.yellow : st.red, fontWeight: 700 }}>{j.taux}%</span>
                <div style={{ color: st.muted, fontSize: 10 }}>{j.validees}/{j.total}</div>
              </div>
              <div style={{ textAlign: 'center', color: j.nbBonus > 0 ? st.yellow : st.border }}>{j.nbBonus > 0 ? `⭐ x${j.nbBonus}` : '—'}</div>
              <div style={{ textAlign: 'center', color: j.cmj ? st.text : st.border }}>{j.cmj ? `${j.cmj}cm` : '—'}</div>
              <div style={{ textAlign: 'center', color: j.s10 ? st.text : st.border }}>{j.s10 ? `${j.s10}s` : '—'}</div>
              <div style={{ textAlign: 'center', color: j.s30 ? st.text : st.border }}>{j.s30 ? `${j.s30}s` : '—'}</div>
              <div style={{ textAlign: 'center', color: j.ift ? st.text : st.border }}>{j.ift ? `${j.ift}km/h` : '—'}</div>
            </div>
          ))}
          {classement.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: st.muted }}>{t('phys_aucun_joueur', lang)}</div>}
        </div>
      </div>
    )
  }

  return null
}
