import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { alpha } from '../../tokens'
import { labelCategorie } from '../../lib/categories'

// Planifie des séances au calendrier (table entrainements) pour une équipe du
// club, à la place de — ou en avance sur — l'éducateur qui la gère : mêmes
// deux mécaniques que côté DashboardEducateur.jsx (ajouterEntrainement/
// genererSaison), juste réécrites pour cibler l'équipe choisie ici plutôt que
// equipeActive. Les séances créées apparaissent ensuite dans le planning de
// l'éducateur exactement comme s'il les avait créées lui-même (RLS dédiée,
// cf. supabase_club_planifie_entrainements.sql).
const JOURS = [
  { num: 1, label: 'Lun' }, { num: 2, label: 'Mar' }, { num: 3, label: 'Mer' },
  { num: 4, label: 'Jeu' }, { num: 5, label: 'Ven' }, { num: 6, label: 'Sam' }, { num: 0, label: 'Dim' },
]

export default function PlanificationSeances({ categories, readOnly }) {
  const colors = useColors()
  const equipesAvecEducateur = categories.filter(c => c.educateur_id)
  const [equipeId, setEquipeId] = useState(equipesAvecEducateur[0]?.id || '')
  const equipe = equipesAvecEducateur.find(e => e.id === equipeId) || null

  const [seances, setSeances] = useState([])
  const [loading, setLoading] = useState(false)
  const [vue, setVue] = useState('saison')

  const [form, setForm] = useState({ date: '', heure: '', lieu: '', description: '' })
  const [saving, setSaving] = useState(false)

  const [planSaison, setPlanSaison] = useState({ joursActifs: [], dateDebut: '', dateFin: '', heuresParJour: {}, theme: '' })
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [planProgress, setPlanProgress] = useState({ done: 0, total: 0 })

  const charger = async (id) => {
    if (!id) { setSeances([]); return }
    setLoading(true)
    const { data } = await supabase.from('entrainements').select('*').eq('club_categorie_id', id).order('date')
    setSeances(data || [])
    setLoading(false)
  }

  useEffect(() => { charger(equipeId) }, [equipeId])

  const ajouterSeance = async () => {
    if (!form.date || !equipe) return
    setSaving(true)
    const { error } = await supabase.from('entrainements').insert({ ...form, educateur_id: equipe.educateur_id, club_categorie_id: equipe.id })
    setSaving(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setForm({ date: '', heure: '', lieu: '', description: '' })
    await charger(equipeId)
  }

  const supprimerSeance = async (id) => {
    if (!confirm('Supprimer cette séance et toutes ses présences ?')) return
    await supabase.from('presences_entrainement').delete().eq('entrainement_id', id)
    const { error } = await supabase.from('entrainements').delete().eq('id', id)
    if (error) { alert('Erreur : ' + error.message); return }
    setSeances(prev => prev.filter(s => s.id !== id))
  }

  const toggleJour = (jour) => {
    setPlanSaison(prev => {
      const actif = prev.joursActifs.includes(jour)
      const heuresParJour = { ...prev.heuresParJour }
      if (actif) delete heuresParJour[jour]
      return { ...prev, joursActifs: actif ? prev.joursActifs.filter(j => j !== jour) : [...prev.joursActifs, jour], heuresParJour }
    })
  }

  const genererSaison = async () => {
    if (!planSaison.dateDebut || !planSaison.dateFin || !planSaison.joursActifs.length || !equipe) return
    setGeneratingPlan(true)
    const dates = []
    const cur = new Date(planSaison.dateDebut)
    const end = new Date(planSaison.dateFin)
    while (cur <= end) {
      if (planSaison.joursActifs.includes(cur.getDay())) {
        dates.push({ date: cur.toISOString().split('T')[0], heure: planSaison.heuresParJour[cur.getDay()] || null })
      }
      cur.setDate(cur.getDate() + 1)
    }
    const existingDates = new Set(seances.map(s => s.date?.substring(0, 10)))
    const newDates = dates.filter(d => !existingDates.has(d.date))
    setPlanProgress({ done: 0, total: newDates.length })
    for (let i = 0; i < newDates.length; i++) {
      await supabase.from('entrainements').insert({
        date: newDates[i].date, heure: newDates[i].heure, description: planSaison.theme || '',
        educateur_id: equipe.educateur_id, club_categorie_id: equipe.id,
      })
      setPlanProgress({ done: i + 1, total: newDates.length })
    }
    setGeneratingPlan(false)
    setPlanSaison({ joursActifs: [], dateDebut: '', dateFin: '', heuresParJour: {}, theme: '' })
    await charger(equipeId)
  }

  const inputStyle = { background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '9px 12px', color: colors.text.primary, fontSize: '13px', width: '100%', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }
  const labelStyle = { color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }

  if (equipesAvecEducateur.length === 0) {
    return <p style={{ color: colors.text.disabled, fontSize: '13px' }}>Aucune équipe avec un éducateur affecté pour l'instant — affecte d'abord un éducateur à une catégorie dans l'onglet Catégories.</p>
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>Équipe</label>
        <select value={equipeId} onChange={e => setEquipeId(e.target.value)} style={{ ...inputStyle, width: 'auto', minWidth: '220px' }}>
          {equipesAvecEducateur.map(c => (
            <option key={c.id} value={c.id}>{labelCategorie(c.nom)} — Équipe {c.equipe}{c.educateur ? ` (${c.educateur.prenom} ${c.educateur.nom})` : ''}</option>
          ))}
        </select>
      </div>

      {!readOnly && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {[{ key: 'saison', label: 'Générer une saison' }, { key: 'ponctuelle', label: '+ Séance ponctuelle' }].map(o => (
            <button key={o.key} onClick={() => setVue(o.key)}
              style={{ padding: '9px 18px', borderRadius: '10px', border: vue === o.key ? `2px solid ${colors.accent.green}` : `1px solid ${colors.border.default}`, background: vue === o.key ? colors.accent.green + alpha.subtle : 'transparent', color: vue === o.key ? colors.accent.green : colors.text.faint, fontWeight: vue === o.key ? 700 : 500, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              {o.label}
            </button>
          ))}
        </div>
      )}

      {!readOnly && vue === 'ponctuelle' && (
        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Heure</label>
              <input type="time" value={form.heure} onChange={e => setForm(f => ({ ...f, heure: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Lieu</label>
              <input value={form.lieu} onChange={e => setForm(f => ({ ...f, lieu: e.target.value }))} placeholder="Stade municipal" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Thème / description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Conservation du ballon" style={inputStyle} />
            </div>
          </div>
          <button onClick={ajouterSeance} disabled={saving || !form.date}
            style={{ background: (saving || !form.date) ? colors.background.raised : colors.accent.green, border: 'none', borderRadius: '10px', padding: '10px 20px', color: (saving || !form.date) ? colors.text.disabled : colors.black, fontWeight: 700, fontSize: '13px', cursor: (saving || !form.date) ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {saving ? 'Ajout...' : 'Ajouter la séance'}
          </button>
        </div>
      )}

      {!readOnly && vue === 'saison' && (
        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
          <p style={{ margin: '0 0 14px', fontSize: '11px', fontWeight: 700, color: colors.text.faint, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Jours d'entraînement</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {JOURS.map(j => {
              const actif = planSaison.joursActifs.includes(j.num)
              return (
                <div key={j.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <button onClick={() => toggleJour(j.num)}
                    style={{ width: '48px', padding: '8px 0', borderRadius: '10px', border: actif ? `2px solid ${colors.accent.green}` : `1px solid ${colors.border.default}`, background: actif ? colors.accent.green + alpha.subtle : 'transparent', color: actif ? colors.accent.green : colors.text.faint, fontWeight: actif ? 700 : 500, fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                    {j.label}
                  </button>
                  {actif && (
                    <input type="time" value={planSaison.heuresParJour[j.num] || ''}
                      onChange={e => setPlanSaison(p => ({ ...p, heuresParJour: { ...p.heuresParJour, [j.num]: e.target.value } }))}
                      style={{ ...inputStyle, width: '48px', padding: '4px 2px', fontSize: '10px', textAlign: 'center' }} />
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Du</label>
              <input type="date" value={planSaison.dateDebut} onChange={e => setPlanSaison(p => ({ ...p, dateDebut: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Au</label>
              <input type="date" value={planSaison.dateFin} onChange={e => setPlanSaison(p => ({ ...p, dateFin: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Thème / description</label>
              <input value={planSaison.theme} onChange={e => setPlanSaison(p => ({ ...p, theme: e.target.value }))} placeholder="Entraînement hebdomadaire" style={inputStyle} />
            </div>
          </div>
          <button onClick={genererSaison} disabled={generatingPlan || !planSaison.dateDebut || !planSaison.dateFin || !planSaison.joursActifs.length}
            style={{ background: (generatingPlan || !planSaison.dateDebut || !planSaison.dateFin || !planSaison.joursActifs.length) ? colors.background.raised : colors.accent.blue, border: 'none', borderRadius: '10px', padding: '10px 20px', color: (generatingPlan || !planSaison.dateDebut || !planSaison.dateFin || !planSaison.joursActifs.length) ? colors.text.disabled : colors.black, fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {generatingPlan ? `Génération... ${planProgress.done}/${planProgress.total}` : 'Générer les séances'}
          </button>
        </div>
      )}

      <p style={{ fontSize: '13px', fontWeight: 700, color: colors.text.primary, marginBottom: '12px' }}>
        {seances.length} séance{seances.length > 1 ? 's' : ''} planifiée{seances.length > 1 ? 's' : ''}
      </p>
      {loading ? (
        <p style={{ color: colors.text.disabled, fontSize: '13px' }}>Chargement...</p>
      ) : seances.length === 0 ? (
        <p style={{ color: colors.text.disabled, fontSize: '13px' }}>Aucune séance planifiée pour cette équipe.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {seances.map(s => (
            <div key={s.id} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px' }}>{new Date(s.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                {s.heure && <span style={{ color: colors.text.faint, fontSize: '13px', marginLeft: '8px' }}>{s.heure}</span>}
                {s.lieu && <span style={{ color: colors.text.faint, fontSize: '12px', marginLeft: '8px' }}>· {s.lieu}</span>}
                {s.description && <span style={{ color: colors.text.faint, fontSize: '12px', marginLeft: '8px' }}>· {s.description}</span>}
              </div>
              {!readOnly && (
                <button onClick={() => supprimerSeance(s.id)} style={{ background: 'none', border: 'none', color: colors.accent.red, cursor: 'pointer', fontSize: '13px' }}>Supprimer</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
