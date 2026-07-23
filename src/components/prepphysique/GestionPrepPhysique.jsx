import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'

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

function ModalCreerProgramme({ onClose, onSave, educateurId }) {
  const [form, setForm] = useState({ titre: '', description: '', date_debut: '', date_fin: '', nb_semaines: 2 })
  const [loading, setLoading] = useState(false)

  const getSaison = () => {
    const now = new Date()
    const y = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
    return `${y}-${y + 1}`
  }

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

function ModalSoumission({ soumission, joueurNom, onClose, onValider, onRefuser }) {
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
          {soumission.statut !== 'refuse' && <button onClick={onRefuser} style={{ padding: '10px 20px', background: st.red, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>❌ Refuser</button>}
          {soumission.statut !== 'valide' && <button onClick={onValider} style={{ padding: '10px 20px', background: st.green, border: 'none', borderRadius: 8, color: '#000', fontWeight: 700, cursor: 'pointer' }}>✅ Valider</button>}
        </div>
      </div>
    </div>
  )
}

export default function GestionPrepPhysique({ educateurId }) {
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
    // profiles.full_name n'existe pas dans ce schéma — seuls nom/prenom sont sélectionnés
    // (nomJoueur() a déjà un fallback prenom+nom pour ce cas).
    const { data } = await supabase.from('soumissions_prep').select('*, joueur:profiles!joueur_id(id, nom, prenom)').in('seance_id', ids).order('created_at', { ascending: false })
    setSoumissions(data || [])
  }

  const loadJoueurs = async () => {
    // Les comptes joueurs de cette app sont plan='pro' ou plan='fan' (il n'existe pas de plan='joueur').
    const { data } = await supabase.from('profiles').select('id, nom, prenom').in('plan', ['pro', 'fan'])
    setJoueurs(data || [])
  }

  const loadTests = async (programmeId) => {
    const { data } = await supabase.from('tests_physiques').select('*, joueur:profiles!joueur_id(id, nom, prenom)').eq('programme_id', programmeId)
    setTests(data || [])
  }

  const ouvrirProgramme = async (p) => {
    setSelectedProgramme(p); setVue('detail')
    await Promise.all([loadSeances(p.id), loadJoueurs()])
  }

  const ouvrirSuivi = async () => {
    setVue('suivi')
    await loadSoumissions(selectedProgramme.id)
  }

  const ouvrirClassement = async () => {
    setVue('classement')
    await Promise.all([loadSoumissions(selectedProgramme.id), loadTests(selectedProgramme.id), loadJoueurs()])
  }

  const validerSoumission = async (id, statut) => {
    await supabase.from('soumissions_prep').update({ statut, valide_par: educateurId, valide_le: new Date().toISOString() }).eq('id', id)
    await loadSoumissions(selectedProgramme.id)
    setModalSoumission(null)
  }

  const supprimerSeance = async (seanceId) => {
    if (!confirm('Supprimer cette séance ?')) return
    await supabase.from('seances_prep').delete().eq('id', seanceId)
    await loadSeances(selectedProgramme.id)
  }

  const getClassement = () => {
    const nbTotal = seances.filter(s => s.type_seance !== 'repos').length
    return joueurs.map(j => {
      const sj = soumissions.filter(s => s.joueur_id === j.id)
      const validees = sj.filter(s => s.statut === 'valide').length
      const taux = nbTotal > 0 ? Math.round((validees / nbTotal) * 100) : 0
      const t = tests.find(t => t.joueur_id === j.id)
      return { ...j, validees, total: nbTotal, taux, cmj: t?.cmj_cm, s10: t?.sprint_10m, s30: t?.sprint_30m, yoyo: t?.yoyo_ir1_m }
    }).sort((a, b) => b.taux - a.taux)
  }

  const nomJoueur = (s) => {
    const j = s.joueur
    return j?.full_name || `${j?.prenom || ''} ${j?.nom || ''}`.trim() || 'Joueur'
  }

  if (loading) return <div style={{ color: st.muted, textAlign: 'center', padding: 40 }}>Chargement...</div>

  if (error === 'tables_missing') return (
    <div style={{ background: '#1a1a00', border: '1px solid #444', borderRadius: 12, padding: 24, margin: 16 }}>
      <div style={{ color: st.yellow, fontWeight: 700, marginBottom: 8 }}>⚠️ Migration SQL requise</div>
      <div style={{ color: st.muted, fontSize: 14 }}>Lance la migration SQL dans Supabase pour activer cette rubrique.</div>
    </div>
  )

  // VUE PROGRAMMES
  if (vue === 'programmes') return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: st.text, margin: 0 }}>🏋️ Préparation Physique</h2>
          <p style={{ color: st.muted, fontSize: 14, margin: '4px 0 0' }}>Programmes de vos joueurs</p>
        </div>
        <button onClick={() => setShowCreerProgramme(true)} style={{ padding: '10px 20px', background: st.green, border: 'none', borderRadius: 8, color: '#000', fontWeight: 700, cursor: 'pointer' }}>+ Nouveau programme</button>
      </div>
      {programmes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: st.muted }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏋️</div>
          <div style={{ color: st.text, marginBottom: 8 }}>Aucun programme</div>
          <div style={{ fontSize: 14 }}>Créez votre premier programme de préparation physique</div>
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
                <span style={{ background: p.statut === 'actif' ? '#14532d' : st.card2, color: p.statut === 'actif' ? st.green : st.muted, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  {p.statut === 'actif' ? '● Actif' : 'Terminé'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      {showCreerProgramme && (
        <ModalCreerProgramme educateurId={educateurId} onClose={() => setShowCreerProgramme(false)}
          onSave={(p) => { setProgrammes(prev => [p, ...prev]); setShowCreerProgramme(false); ouvrirProgramme(p) }} />
      )}
    </div>
  )

  // VUE DETAIL (grille semaines/jours)
  if (vue === 'detail') {
    const nbSemaines = selectedProgramme.nb_semaines || 2
    return (
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <button onClick={() => setVue('programmes')} style={{ background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, padding: '8px 16px', color: st.text, cursor: 'pointer' }}>← Retour</button>
          <div style={{ flex: 1 }}>
            <h2 style={{ color: st.text, margin: 0, fontSize: 18 }}>{selectedProgramme.titre}</h2>
          </div>
          <button onClick={ouvrirSuivi} style={{ padding: '8px 16px', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, color: st.text, cursor: 'pointer' }}>📋 Suivi</button>
          <button onClick={ouvrirClassement} style={{ padding: '8px 16px', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, color: st.text, cursor: 'pointer' }}>🏆 Classement</button>
        </div>
        {Array.from({ length: nbSemaines }, (_, i) => i + 1).map(sem => (
          <div key={sem} style={{ marginBottom: 24 }}>
            <h3 style={{ color: st.green, marginBottom: 12, fontSize: 13, fontWeight: 700, letterSpacing: '0.05em' }}>SEMAINE {sem}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
              {JOURS.map((jourLabel, ji) => {
                const jour = ji + 1
                const seance = seances.find(s => s.semaine === sem && s.jour === jour)
                const typeInfo = TYPES_SEANCE.find(t => t.value === seance?.type_seance) || TYPES_SEANCE[0]
                const isRepos = seance?.type_seance === 'repos'
                return (
                  <div key={jour}>
                    <div style={{ color: st.muted, fontSize: 11, textAlign: 'center', marginBottom: 4, fontWeight: 600 }}>{jourLabel}</div>
                    <div onClick={() => setModalSeance({ semaine: sem, jour, seance })}
                      style={{ background: seance ? (isRepos ? '#1a1a1a' : '#0a1a0a') : st.card, border: `1px solid ${seance ? (isRepos ? '#333' : st.green) : st.border}`, borderRadius: 8, padding: 10, minHeight: 80, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, opacity: isRepos ? 0.5 : 1 }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = st.green}
                      onMouseLeave={e => e.currentTarget.style.borderColor = seance ? (isRepos ? '#333' : st.green) : st.border}>
                      {seance ? (
                        <>
                          <div style={{ fontSize: 20 }}>{typeInfo.icon}</div>
                          <div style={{ color: st.text, fontSize: 10, textAlign: 'center', lineHeight: 1.3 }}>{seance.titre}</div>
                          {seance.duree_cible && <div style={{ color: st.muted, fontSize: 10 }}>{seance.duree_cible}min</div>}
                        </>
                      ) : <div style={{ color: st.border, fontSize: 20 }}>+</div>}
                    </div>
                    {seance && <button onClick={e => { e.stopPropagation(); supprimerSeance(seance.id) }} style={{ width: '100%', marginTop: 3, background: 'transparent', border: 'none', color: st.muted, fontSize: 10, cursor: 'pointer' }}>suppr.</button>}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {modalSeance && <ModalSeance {...modalSeance} programmeId={selectedProgramme.id} onClose={() => setModalSeance(null)} onSave={async () => { await loadSeances(selectedProgramme.id); setModalSeance(null) }} />}
      </div>
    )
  }

  // VUE SUIVI
  if (vue === 'suivi') return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button onClick={() => setVue('detail')} style={{ background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, padding: '8px 16px', color: st.text, cursor: 'pointer' }}>← Programme</button>
        <h2 style={{ color: st.text, margin: 0, fontSize: 18 }}>📋 Suivi des joueurs</h2>
      </div>
      {soumissions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: st.muted }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📬</div>
          <div style={{ color: st.text, marginBottom: 8 }}>Aucune soumission reçue</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {soumissions.map(s => {
            const nom = nomJoueur(s)
            const seance = seances.find(se => se.id === s.seance_id)
            const statutColor = s.statut === 'valide' ? st.green : s.statut === 'refuse' ? st.red : st.yellow
            const statutBg = s.statut === 'valide' ? '#14532d' : s.statut === 'refuse' ? '#450a0a' : '#1a1a00'
            return (
              <div key={s.id} style={{ background: st.card, border: `1px solid ${st.border}`, borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: st.green, color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{nom.charAt(0)}</div>
                    <div>
                      <div style={{ color: st.text, fontWeight: 700 }}>{nom}</div>
                      <div style={{ color: st.muted, fontSize: 12 }}>{seance?.titre || '—'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {s.duree_reelle && <span style={{ color: st.muted, fontSize: 13 }}>⏱ {s.duree_reelle}min</span>}
                    {s.distance_reelle && <span style={{ color: st.muted, fontSize: 13 }}>📍 {s.distance_reelle}km</span>}
                    {s.proof_url && <span style={{ color: st.green, fontSize: 13 }}>📷 Screenshot</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <span style={{ background: statutBg, color: statutColor, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {s.statut === 'valide' ? '✅ Validé' : s.statut === 'refuse' ? '❌ Refusé' : '⏳ En attente'}
                  </span>
                  <button onClick={() => setModalSoumission({ soumission: s, joueurNom: nom })} style={{ padding: '6px 14px', background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, color: st.text, cursor: 'pointer', fontSize: 13 }}>Voir →</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {modalSoumission && <ModalSoumission {...modalSoumission} onClose={() => setModalSoumission(null)} onValider={() => validerSoumission(modalSoumission.soumission.id, 'valide')} onRefuser={() => validerSoumission(modalSoumission.soumission.id, 'refuse')} />}
    </div>
  )

  // VUE CLASSEMENT
  if (vue === 'classement') {
    const classement = getClassement()
    return (
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <button onClick={() => setVue('detail')} style={{ background: st.card2, border: `1px solid ${st.border}`, borderRadius: 8, padding: '8px 16px', color: st.text, cursor: 'pointer' }}>← Programme</button>
          <h2 style={{ color: st.text, margin: 0, fontSize: 18 }}>🏆 Classement</h2>
        </div>
        <div style={{ background: st.card, border: `1px solid ${st.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 90px 65px 65px 65px 70px', padding: '12px 16px', background: st.card2, color: st.muted, fontSize: 11, fontWeight: 700, gap: 8 }}>
            <div>#</div><div>JOUEUR</div><div style={{ textAlign: 'center' }}>RÉGULARITÉ</div>
            <div style={{ textAlign: 'center' }}>CMJ</div><div style={{ textAlign: 'center' }}>10m</div>
            <div style={{ textAlign: 'center' }}>30m</div><div style={{ textAlign: 'center' }}>Yo-Yo</div>
          </div>
          {classement.map((j, idx) => (
            <div key={j.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 90px 65px 65px 65px 70px', padding: '12px 16px', borderTop: `1px solid ${st.border}`, gap: 8, alignItems: 'center', background: idx === 0 ? '#0a1a0a' : 'transparent' }}>
              <div style={{ color: idx === 0 ? st.green : st.muted, fontWeight: 700 }}>{idx + 1}</div>
              <div style={{ color: st.text, fontWeight: idx < 3 ? 700 : 400 }}>{j.full_name || `${j.prenom || ''} ${j.nom || ''}`}</div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ color: j.taux >= 80 ? st.green : j.taux >= 50 ? st.yellow : st.red, fontWeight: 700 }}>{j.taux}%</span>
                <div style={{ color: st.muted, fontSize: 10 }}>{j.validees}/{j.total}</div>
              </div>
              <div style={{ textAlign: 'center', color: j.cmj ? st.text : st.border }}>{j.cmj ? `${j.cmj}cm` : '—'}</div>
              <div style={{ textAlign: 'center', color: j.s10 ? st.text : st.border }}>{j.s10 ? `${j.s10}s` : '—'}</div>
              <div style={{ textAlign: 'center', color: j.s30 ? st.text : st.border }}>{j.s30 ? `${j.s30}s` : '—'}</div>
              <div style={{ textAlign: 'center', color: j.yoyo ? st.text : st.border }}>{j.yoyo ? `${j.yoyo}m` : '—'}</div>
            </div>
          ))}
          {classement.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: st.muted }}>Aucun joueur</div>}
        </div>
      </div>
    )
  }

  return null
}
