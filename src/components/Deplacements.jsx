import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import PlanningWeekEnd from './PlanningWeekEnd'

const NATURES = [
  { val: 'match', label: '⚽ Match', emoji: '⚽' },
  { val: 'tournoi', label: '🏆 Tournoi', emoji: '🏆' },
  { val: 'stage', label: '🏕️ Stage', emoji: '🏕️' },
  { val: 'autre', label: '📦 Autre', emoji: '📦' },
]

const formVide = () => ({
  equipe: '', educateur_responsable: '', date_depart: '', heure_depart: '',
  heure_retour_estimee: '', nb_personnes: '',
  lieu_destination: '', nature: 'match', vehicule: '', conducteur: '',
  km_avant: '', gasoil_avant: '',
})

const st = {
  input: { width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' },
  label: { fontSize: '11px', color: '#555', marginBottom: '4px', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  card: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' },
}

const natureInfo = (val) => NATURES.find(n => n.val === val) || NATURES[3]

export default function Deplacements({ clubId, accentColor = '#4ade80', readOnly = false }) {
  const [vue, setVue] = useState('liste') // 'liste' | 'weekend'
  const [deplacements, setDeplacements] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableMissing, setTableMissing] = useState(false)
  const [equipesOptions, setEquipesOptions] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(formVide)
  const [saving, setSaving] = useState(false)
  const [retourEdits, setRetourEdits] = useState({}) // { [id]: { km_apres, gasoil_apres } }
  const [savingRetour, setSavingRetour] = useState({}) // { [id]: bool }

  const charger = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('deplacements').select('*').eq('club_id', clubId).order('date_depart', { ascending: false })
    if (error) {
      if (error.code === '42P01') setTableMissing(true)
      setLoading(false)
      return
    }
    setTableMissing(false)
    setDeplacements(data || [])
    setLoading(false)
  }

  const chargerEquipes = async () => {
    const { data } = await supabase.from('club_categories').select('id, nom, equipe').eq('club_id', clubId).order('nom')
    setEquipesOptions(data || [])
  }

  useEffect(() => { if (clubId) { charger(); chargerEquipes() } }, [clubId])

  const creerDeplacement = async () => {
    if (!form.date_depart || !form.lieu_destination.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('deplacements').insert({
      club_id: clubId,
      equipe: form.equipe || null,
      educateur_responsable: form.educateur_responsable.trim() || null,
      date_depart: form.date_depart,
      heure_depart: form.heure_depart || null,
      heure_retour_estimee: form.heure_retour_estimee || null,
      nb_personnes: form.nb_personnes !== '' ? parseInt(form.nb_personnes) : null,
      lieu_destination: form.lieu_destination.trim(),
      nature: form.nature,
      vehicule: form.vehicule.trim() || null,
      conducteur: form.conducteur.trim() || null,
      km_avant: form.km_avant !== '' ? parseFloat(form.km_avant) : null,
      gasoil_avant: form.gasoil_avant.trim() || null,
      created_by: user?.id || null,
    })
    setSaving(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setForm(formVide())
    setShowForm(false)
    await charger()
  }

  const setRetourField = (id, field, value) => {
    setRetourEdits(prev => ({
      ...prev,
      [id]: { km_apres: prev[id]?.km_apres ?? '', gasoil_apres: prev[id]?.gasoil_apres ?? '', [field]: value },
    }))
  }

  const enregistrerRetour = async (id) => {
    const edit = retourEdits[id]
    if (!edit) return
    setSavingRetour(prev => ({ ...prev, [id]: true }))
    const { error } = await supabase.from('deplacements').update({
      km_apres: edit.km_apres !== '' ? parseFloat(edit.km_apres) : null,
      gasoil_apres: edit.gasoil_apres?.trim() || null,
    }).eq('id', id)
    setSavingRetour(prev => ({ ...prev, [id]: false }))
    if (error) { alert('Erreur : ' + error.message); return }
    await charger()
  }

  if (tableMissing) {
    return (
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>🚌 Déplacements</h1>
        <div style={{ background: '#f59e0b10', border: '1px solid #f59e0b40', borderRadius: '10px', padding: '12px 16px', marginTop: '1rem', color: '#f59e0b', fontSize: '13px' }}>
          ⚠️ La table <code>deplacements</code> n'existe pas encore en base — exécute la migration SQL pour activer cet outil.
        </div>
      </div>
    )
  }

  const aujourdHui = new Date().toISOString().split('T')[0]
  const aVenir = deplacements.filter(d => d.date_depart >= aujourdHui).sort((a, b) => a.date_depart.localeCompare(b.date_depart))
  const historique = deplacements.filter(d => d.date_depart < aujourdHui).sort((a, b) => b.date_depart.localeCompare(a.date_depart))

  const renderCard = (d) => {
    const edit = retourEdits[d.id] || { km_apres: d.km_apres ?? '', gasoil_apres: d.gasoil_apres ?? '' }
    const retourComplet = d.km_apres != null && d.gasoil_apres
    return (
      <div key={d.id} style={{ ...st.card, marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>
              {natureInfo(d.nature).emoji} {d.lieu_destination}
              {d.equipe && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#666', fontWeight: 600 }}>· {d.equipe}</span>}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#555' }}>
              {new Date(d.date_depart + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              {d.heure_depart ? ` · départ ${d.heure_depart.slice(0, 5)}` : ''}
              {d.heure_retour_estimee ? ` · retour ${d.heure_retour_estimee.slice(0, 5)}` : ''}
              {d.nb_personnes != null ? ` · ${d.nb_personnes} pers.` : ''}
              {d.educateur_responsable ? ` · Resp. ${d.educateur_responsable}` : ''}
            </p>
            {(d.vehicule || d.conducteur) && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#777' }}>
                {d.vehicule ? `🚐 ${d.vehicule}` : ''}{d.vehicule && d.conducteur ? ' · ' : ''}{d.conducteur ? `👤 ${d.conducteur}` : ''}
              </p>
            )}
          </div>
          <span style={{ background: accentColor + '15', border: `1px solid ${accentColor}40`, color: accentColor, fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', flexShrink: 0 }}>
            {natureInfo(d.nature).label}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #1a1a1a' }}>
          <div>
            <p style={st.label}>Km avant</p>
            <p style={{ margin: 0, fontSize: '13px', color: d.km_avant != null ? '#fff' : '#444' }}>{d.km_avant != null ? `${d.km_avant} km` : '—'}</p>
          </div>
          <div>
            <p style={st.label}>Gasoil avant</p>
            <p style={{ margin: 0, fontSize: '13px', color: d.gasoil_avant ? '#fff' : '#444' }}>{d.gasoil_avant || '—'}</p>
          </div>
          <div>
            <p style={st.label}>Km après (retour)</p>
            <input type="number" value={edit.km_apres} placeholder="—" disabled={readOnly}
              onChange={e => setRetourField(d.id, 'km_apres', e.target.value)}
              style={{ ...st.input, padding: '6px 8px', fontSize: '13px' }} />
          </div>
          <div>
            <p style={st.label}>Gasoil après (retour)</p>
            <input type="text" value={edit.gasoil_apres} placeholder="ex: 2/4" disabled={readOnly}
              onChange={e => setRetourField(d.id, 'gasoil_apres', e.target.value)}
              style={{ ...st.input, padding: '6px 8px', fontSize: '13px' }} />
          </div>
        </div>
        {!readOnly && (
          <button onClick={() => enregistrerRetour(d.id)} disabled={savingRetour[d.id]}
            style={{ marginTop: '10px', background: retourComplet ? '#1a1a1a' : accentColor + '15', border: `1px solid ${retourComplet ? '#2a2a2a' : accentColor + '40'}`, color: retourComplet ? '#666' : accentColor, padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {savingRetour[d.id] ? 'Enregistrement...' : retourComplet ? '✅ Retour enregistré — modifier' : '💾 Enregistrer le retour'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>🚌 Déplacements</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#555' }}>Organisation des transports pour matchs, tournois et stages</p>
        </div>
        {vue === 'liste' && !readOnly && (
          <button onClick={() => setShowForm(v => !v)}
            style={{ background: accentColor, color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {showForm ? '✕ Fermer' : '+ Nouveau déplacement'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
        {[['liste', 'Liste'], ['weekend', 'Planning week-end']].map(([val, label]) => (
          <button key={val} onClick={() => setVue(val)}
            style={{ padding: '8px 18px', borderRadius: '10px', border: 'none', background: vue === val ? accentColor : '#1a1a1a', color: vue === val ? '#000' : '#888', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {label}
          </button>
        ))}
      </div>

      {vue === 'weekend' && <PlanningWeekEnd clubId={clubId} accentColor={accentColor} />}

      {vue === 'liste' && showForm && !readOnly && (
        <div style={{ ...st.card, marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={st.label}>Équipe</label>
              {equipesOptions.length > 0 ? (
                <select style={st.input} value={form.equipe} onChange={e => setForm(f => ({ ...f, equipe: e.target.value }))}>
                  <option value="">—</option>
                  {equipesOptions.map(c => <option key={c.id} value={`${c.nom} ${c.equipe || ''}`.trim()}>{c.nom} {c.equipe}</option>)}
                </select>
              ) : (
                <input style={st.input} value={form.equipe} onChange={e => setForm(f => ({ ...f, equipe: e.target.value }))} placeholder="Ex: U15 A" />
              )}
            </div>
            <div>
              <label style={st.label}>Éducateur responsable</label>
              <input style={st.input} value={form.educateur_responsable} onChange={e => setForm(f => ({ ...f, educateur_responsable: e.target.value }))} placeholder="Nom" />
            </div>
            <div>
              <label style={st.label}>Date de départ</label>
              <input style={st.input} type="date" value={form.date_depart} onChange={e => setForm(f => ({ ...f, date_depart: e.target.value }))} />
            </div>
            <div>
              <label style={st.label}>Heure de départ</label>
              <input style={st.input} type="time" value={form.heure_depart} onChange={e => setForm(f => ({ ...f, heure_depart: e.target.value }))} />
            </div>
            <div>
              <label style={st.label}>Heure de retour estimée</label>
              <input style={st.input} type="time" value={form.heure_retour_estimee} onChange={e => setForm(f => ({ ...f, heure_retour_estimee: e.target.value }))} />
            </div>
            <div>
              <label style={st.label}>Nb personnes (joueurs + staff)</label>
              <input style={st.input} type="number" min="0" value={form.nb_personnes} onChange={e => setForm(f => ({ ...f, nb_personnes: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={st.label}>Lieu / destination</label>
              <input style={st.input} value={form.lieu_destination} onChange={e => setForm(f => ({ ...f, lieu_destination: e.target.value }))} placeholder="Ex: Stade municipal, Lyon" />
            </div>
            <div>
              <label style={st.label}>Nature</label>
              <select style={st.input} value={form.nature} onChange={e => setForm(f => ({ ...f, nature: e.target.value }))}>
                {NATURES.map(n => <option key={n.val} value={n.val}>{n.label}</option>)}
              </select>
            </div>
            <div>
              <label style={st.label}>Véhicule (plaque)</label>
              <input style={st.input} value={form.vehicule} onChange={e => setForm(f => ({ ...f, vehicule: e.target.value }))} placeholder="Ex: AB-123-CD" />
            </div>
            <div>
              <label style={st.label}>Conducteur</label>
              <input style={st.input} value={form.conducteur} onChange={e => setForm(f => ({ ...f, conducteur: e.target.value }))} placeholder="Nom du conducteur" />
            </div>
            <div>
              <label style={st.label}>Km avant départ</label>
              <input style={st.input} type="number" value={form.km_avant} onChange={e => setForm(f => ({ ...f, km_avant: e.target.value }))} />
            </div>
            <div>
              <label style={st.label}>Gasoil avant départ</label>
              <input style={st.input} value={form.gasoil_avant} onChange={e => setForm(f => ({ ...f, gasoil_avant: e.target.value }))} placeholder="Ex: 4/4" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={creerDeplacement} disabled={saving || !form.date_depart || !form.lieu_destination.trim()}
              style={{ background: accentColor, color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Création...' : 'Créer le déplacement'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(formVide()) }}
              style={{ background: 'transparent', border: '1px solid #333', color: '#888', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {vue === 'liste' && (
        loading ? (
          <p style={{ color: '#444', fontSize: '13px' }}>Chargement...</p>
        ) : (
          <>
            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 12px' }}>📅 À venir {aVenir.length > 0 ? `(${aVenir.length})` : ''}</p>
            {aVenir.length === 0 ? (
              <p style={{ color: '#444', fontSize: '13px', marginBottom: '1.5rem' }}>Aucun déplacement à venir.</p>
            ) : (
              <div style={{ marginBottom: '1.5rem' }}>{aVenir.map(renderCard)}</div>
            )}

            <p style={{ fontWeight: 700, fontSize: '15px', margin: '0 0 12px' }}>🗂️ Historique {historique.length > 0 ? `(${historique.length})` : ''}</p>
            {historique.length === 0 ? (
              <p style={{ color: '#444', fontSize: '13px' }}>Aucun déplacement dans l'historique.</p>
            ) : (
              <div>{historique.map(renderCard)}</div>
            )}
          </>
        )
      )}
    </div>
  )
}
