import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
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

export default function PlanificationSeances({ categories, readOnly, accentColor }) {
  const colors = useColors()
  const equipesAvecEducateur = categories.filter(c => c.educateur_id)
  const [equipeId, setEquipeId] = useState(equipesAvecEducateur[0]?.id || '')
  const equipe = equipesAvecEducateur.find(e => e.id === equipeId) || null

  const [seances, setSeances] = useState([])
  const [loading, setLoading] = useState(false)
  const [vue, setVue] = useState('saison')
  const [afficherPassees, setAfficherPassees] = useState(false)

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

  // V2 : équipe choisie en cartes, générateur avec aperçu du nombre de
  // séances, séances à venir groupées par mois (passées repliées).
  const accent = accentColor || colors.accent.green
  const inputStyle = { background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '9px 12px', color: colors.text.primary, fontSize: '13px', width: '100%', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }
  const labelStyle = { color: colors.text.faint, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }
  const eyebrow = { margin: 0, fontSize: '11px', fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase', color: colors.text.secondary }
  const carte = { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '14px', padding: '18px 20px' }

  if (equipesAvecEducateur.length === 0) {
    return (
      <div style={{ ...carte, textAlign: 'center', padding: '32px 20px' }}>
        <p style={{ margin: 0, color: colors.text.secondary, fontWeight: 600 }}>Aucune équipe avec un éducateur affecté</p>
        <p style={{ margin: '6px 0 0', color: colors.text.faint, fontSize: '12px' }}>Affecte d'abord un éducateur à une équipe dans Catégories & Équipes.</p>
      </div>
    )
  }

  // Aperçu : nombre de séances que la génération créerait (dates déjà
  // planifiées exclues, même règle que genererSaison).
  const apercuSaison = (() => {
    if (!planSaison.dateDebut || !planSaison.dateFin || !planSaison.joursActifs.length) return null
    const existantes = new Set(seances.map(x => x.date?.substring(0, 10)))
    let n = 0
    const cur = new Date(planSaison.dateDebut), end = new Date(planSaison.dateFin)
    while (cur <= end) {
      if (planSaison.joursActifs.includes(cur.getDay()) && !existantes.has(cur.toISOString().split('T')[0])) n++
      cur.setDate(cur.getDate() + 1)
    }
    return n
  })()
  const aujourdHui = new Date().toISOString().split('T')[0]
  const aVenir = seances.filter(x => x.date >= aujourdHui)
  const passees = seances.filter(x => x.date < aujourdHui)
  const visibles = afficherPassees ? seances : aVenir
  const parMois = visibles.reduce((acc, x) => { const k = x.date.slice(0, 7); (acc[k] = acc[k] || []).push(x); return acc }, {})
  const saisonInvalide = generatingPlan || !planSaison.dateDebut || !planSaison.dateFin || !planSaison.joursActifs.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>Planifier séance</h1>
        <p style={{ color: colors.text.faint, fontSize: '13px', margin: '4px 0 0' }}>Les séances créées ici apparaissent dans le planning de l'éducateur de l'équipe.</p>
      </div>

      {/* Choix de l'équipe */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
        {equipesAvecEducateur.map(c => {
          const actif = c.id === equipeId
          return (
            <button key={c.id} onClick={() => setEquipeId(c.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', padding: '10px 14px', borderRadius: '12px', border: `1px solid ${actif ? accent + '80' : colors.border.default}`, background: actif ? accent + '14' : colors.background.surface, cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif', minWidth: 0 }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: actif ? accent : colors.text.primary }}>{labelCategorie(c.nom)} {c.equipe}</span>
              <span style={{ fontSize: '11px', color: colors.text.faint, textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{c.educateur ? `${c.educateur.prenom || ''} ${c.educateur.nom || ''}`.toLowerCase() : '—'}</span>
            </button>
          )
        })}
      </div>

      {!readOnly && (
        <div style={carte}>
          <div style={{ display: 'inline-flex', padding: '3px', borderRadius: '10px', background: colors.background.base, border: `1px solid ${colors.border.subtle}`, marginBottom: '18px' }}>
            {[{ key: 'saison', label: 'Générer une saison' }, { key: 'ponctuelle', label: 'Séance ponctuelle' }].map(o => (
              <button key={o.key} onClick={() => setVue(o.key)}
                style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: vue === o.key ? colors.background.raised : 'transparent', color: vue === o.key ? colors.text.primary : colors.text.faint, fontWeight: vue === o.key ? 700 : 500, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                {o.label}
              </button>
            ))}
          </div>

          {vue === 'ponctuelle' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
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
                style={{ background: (saving || !form.date) ? colors.background.raised : accent, border: 'none', borderRadius: '10px', padding: '10px 20px', color: (saving || !form.date) ? colors.text.disabled : colors.black, fontWeight: 700, fontSize: '13px', cursor: (saving || !form.date) ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                {saving ? 'Ajout...' : 'Ajouter la séance'}
              </button>
            </>
          )}

          {vue === 'saison' && (
            <>
              <p style={{ ...eyebrow, marginBottom: '10px' }}>Jours et heures d'entraînement</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
                {JOURS.map(j => {
                  const actif = planSaison.joursActifs.includes(j.num)
                  return (
                    <div key={j.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '6px', borderRadius: '12px', background: actif ? accent + '10' : 'transparent', border: `1px solid ${actif ? accent + '50' : 'transparent'}` }}>
                      <button onClick={() => toggleJour(j.num)}
                        style={{ width: '56px', padding: '8px 0', borderRadius: '9px', border: `1px solid ${actif ? accent : colors.border.default}`, background: actif ? accent : 'transparent', color: actif ? colors.black : colors.text.secondary, fontWeight: 700, fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                        {j.label}
                      </button>
                      {actif && (
                        <input type="time" value={planSaison.heuresParJour[j.num] || ''}
                          onChange={e => setPlanSaison(p => ({ ...p, heuresParJour: { ...p.heuresParJour, [j.num]: e.target.value } }))}
                          style={{ ...inputStyle, width: '72px', padding: '5px 4px', fontSize: '11px', textAlign: 'center' }} />
                      )}
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <button onClick={genererSaison} disabled={saisonInvalide}
                  style={{ background: saisonInvalide ? colors.background.raised : accent, border: 'none', borderRadius: '10px', padding: '10px 20px', color: saisonInvalide ? colors.text.disabled : colors.black, fontWeight: 700, fontSize: '13px', cursor: saisonInvalide ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {generatingPlan ? `Génération... ${planProgress.done}/${planProgress.total}` : 'Générer les séances'}
                </button>
                <span style={{ fontSize: '12px', color: apercuSaison ? colors.text.secondary : colors.text.faint }}>
                  {apercuSaison == null ? 'Choisis au moins un jour et une période.' : apercuSaison === 0 ? 'Aucune nouvelle séance : ces dates sont déjà planifiées.' : <><strong style={{ color: accent }}>{apercuSaison}</strong> séance{apercuSaison > 1 ? 's' : ''} seront créée{apercuSaison > 1 ? 's' : ''}</>}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <p style={eyebrow}>Séances planifiées · {aVenir.length} à venir</p>
          {passees.length > 0 && (
            <button onClick={() => setAfficherPassees(v => !v)} style={{ background: 'none', border: `1px solid ${colors.border.default}`, borderRadius: '8px', color: colors.text.secondary, fontSize: '12px', fontWeight: 600, padding: '5px 12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              {afficherPassees ? 'Masquer les passées' : `Afficher les ${passees.length} passées`}
            </button>
          )}
        </div>
        {loading ? (
          <p style={{ color: colors.text.faint, fontSize: '13px' }}>Chargement...</p>
        ) : visibles.length === 0 ? (
          <div style={{ ...carte, textAlign: 'center', padding: '24px' }}>
            <p style={{ margin: 0, color: colors.text.faint, fontSize: '13px' }}>Aucune séance à venir pour cette équipe.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.keys(parMois).sort().map(k => (
              <div key={k}>
                <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: colors.text.primary }}>
                  {new Date(`${k}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} <span style={{ fontWeight: 500, letterSpacing: 0, textTransform: 'none', color: colors.text.faint }}>· {parMois[k].length} séance{parMois[k].length > 1 ? 's' : ''}</span>
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px' }}>
                  {parMois[k].map(x => {
                    const d = new Date(x.date + 'T12:00:00')
                    const passee = x.date < aujourdHui
                    return (
                      <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '10px', opacity: passee ? 0.6 : 1, minWidth: 0 }}>
                        <div style={{ width: '44px', textAlign: 'center', border: `1px solid ${colors.border.default}`, borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                          <p style={{ margin: 0, padding: '2px 0', fontSize: '9px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: colors.text.faint, background: colors.background.raised }}>{d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</p>
                          <p style={{ margin: 0, padding: '4px 0', fontSize: '17px', fontWeight: 800, lineHeight: 1 }}>{d.getDate()}</p>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.description || 'Entraînement'}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '11px', color: colors.text.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[x.heure?.slice(0, 5), x.lieu].filter(Boolean).join(' · ') || 'Horaire à définir'}</p>
                        </div>
                        {!readOnly && (
                          <button onClick={() => supprimerSeance(x.id)} title="Supprimer" style={{ background: 'none', border: 'none', color: colors.text.faint, cursor: 'pointer', padding: '4px', display: 'flex' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
