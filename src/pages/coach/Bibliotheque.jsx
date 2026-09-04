import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { useCoachTheme } from './useCoachTheme'
import Card from '../../components/coachAdmin/Card'
import FilterBar from '../../components/coachAdmin/FilterBar'
import BibliothequeVideos from '../../components/BibliothequeVideos'
import { IcoLibrary, IcoX } from './NavIcons'

const TYPES = [
  { val: '', label: 'Tous' },
  { val: 'jeu', label: 'Jeu' },
  { val: 'exercice', label: 'Exercice' },
  { val: 'situation', label: 'Situation' },
  { val: 'echauffement', label: 'Échauffement' },
]

const PROCEDE_VIDE = { type: 'exercice', nom: '', theme: '', description: '', consignes: '', variables: '', duree: '', nb_joueurs: '', tags: '' }

// Alimentation directe de la bibliothèque "Digital Football" (partagée à
// tous les comptes éducateur, cf. bibliotheque_exercices.partage_platform)
// par un compte coach admin — pas de notion "Ma bibliothèque"/"club" ici,
// contrairement à la rubrique équivalente du Dashboard Éducateur : tout ce
// qui est créé depuis cet onglet est automatiquement partagé à la
// plateforme, c'est son unique but.
export default function Bibliotheque({ coachId }) {
  const { c, rgba } = useCoachTheme()
  const [vue, setVue] = useState('exercices') // 'exercices' | 'videos'
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtreType, setFiltreType] = useState('')
  const [recherche, setRecherche] = useState('')
  const [modalOuverte, setModalOuverte] = useState(false)
  const [enEdition, setEnEdition] = useState(null) // null = nouveau
  const [form, setForm] = useState(PROCEDE_VIDE)
  const [saving, setSaving] = useState(false)

  const charger = async () => {
    setLoading(true)
    const { data } = await supabase.from('bibliotheque_exercices').select('*, educateur:educateur_id(prenom, nom)').eq('partage_platform', true).order('type').order('nom')
    setItems(data || [])
    setLoading(false)
  }
  useEffect(() => { if (vue === 'exercices') charger() }, [vue])

  const itemsFiltres = items.filter(p => {
    if (filtreType && p.type !== filtreType) return false
    const q = recherche.trim().toLowerCase()
    if (q && !`${p.nom} ${p.theme || ''}`.toLowerCase().includes(q)) return false
    return true
  })

  const ouvrirNouveau = () => { setEnEdition(null); setForm(PROCEDE_VIDE); setModalOuverte(true) }
  const ouvrirEdition = (p) => {
    setEnEdition(p)
    setForm({ type: p.type, nom: p.nom, theme: p.theme || '', description: p.description || '', consignes: p.consignes || '', variables: p.variables || '', duree: p.duree?.toString() || '', nb_joueurs: p.nb_joueurs || '', tags: p.tags || '' })
    setModalOuverte(true)
  }

  const sauvegarder = async () => {
    if (!form.nom.trim()) return
    setSaving(true)
    const payload = { ...form, duree: form.duree ? parseInt(form.duree) : null, educateur_id: coachId, club_id: null, partage_club: false, partage_platform: true }
    const { error } = enEdition
      ? await supabase.from('bibliotheque_exercices').update(payload).eq('id', enEdition.id)
      : await supabase.from('bibliotheque_exercices').insert(payload)
    setSaving(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setModalOuverte(false)
    await charger()
  }

  const supprimer = async (id) => {
    if (!confirm('Supprimer ce procédé de la bibliothèque Digital Football ?')) return
    await supabase.from('bibliotheque_exercices').delete().eq('id', id)
    setItems(prev => prev.filter(p => p.id !== id))
  }

  const champ = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const inputStyle = { width: '100%', background: c.surface2, border: `1px solid ${c.border}`, borderRadius: '8px', color: c.text, padding: '9px 12px', fontSize: '13px', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }
  const labelStyle = { fontSize: '11px', color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }

  return (
    <>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {[['exercices', 'Exercices'], ['videos', 'Vidéos']].map(([v, label]) => (
          <button key={v} onClick={() => setVue(v)}
            style={{ padding: '8px 18px', borderRadius: '8px', border: `1px solid ${vue === v ? c.accent : c.border}`, background: vue === v ? rgba(c.accent, 0.12) : c.surface, color: vue === v ? c.accent : c.textMuted, fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {label}
          </button>
        ))}
      </div>

      {vue === 'exercices' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <FilterBar
              toggles={TYPES.map(ty => ({ key: ty.val || 'tous', label: ty.label, active: filtreType === ty.val, onClick: () => setFiltreType(ty.val) }))}
              search={recherche}
              onSearchChange={setRecherche}
              searchPlaceholder="Rechercher un procédé..."
            />
            <button onClick={ouvrirNouveau} style={{ background: c.accent, color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Nouveau procédé</button>
          </div>

          {loading ? (
            <p style={{ color: c.textMuted, fontSize: '13px' }}>Chargement...</p>
          ) : itemsFiltres.length === 0 ? (
            <Card>
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: c.textMuted }}><IcoLibrary size={40} /></div>
                <p style={{ color: c.textMuted }}>{items.length === 0 ? "Aucun procédé dans la bibliothèque Digital Football pour l'instant." : 'Aucun procédé ne correspond à ces filtres.'}</p>
              </div>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {itemsFiltres.map(p => (
                <Card key={p.id}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: c.accent, textTransform: 'uppercase' }}>{TYPES.find(t => t.val === p.type)?.label || p.type}</span>
                  <p style={{ margin: '4px 0 8px', fontWeight: 700, fontSize: '14px', color: c.text }}>{p.nom}</p>
                  {p.theme && <p style={{ margin: '0 0 8px', fontSize: '12px', color: c.textMuted }}>{p.theme}</p>}
                  {p.description && <p style={{ margin: '0 0 10px', fontSize: '12px', color: c.textMuted, whiteSpace: 'pre-wrap' }}>{p.description}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: c.textMuted }}>{p.educateur ? `Ajouté par ${p.educateur.prenom} ${p.educateur.nom}` : ''}</span>
                    {p.educateur_id === coachId && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => ouvrirEdition(p)} style={{ background: 'none', border: `1px solid ${c.border}`, color: c.textMuted, borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>Modifier</button>
                        <button onClick={() => supprimer(p.id)} style={{ background: 'none', border: `1px solid ${rgba(c.danger, 0.4)}`, color: c.danger, borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer' }}>Supprimer</button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <BibliothequeVideos type="df" peutAjouter accentColor={c.accent} />
      )}

      {modalOuverte && (
        <div onClick={() => setModalOuverte(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: '16px', width: '100%', maxWidth: '560px', padding: '24px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '16px', color: c.text }}>{enEdition ? 'Modifier le procédé' : 'Nouveau procédé — Digital Football'}</p>
              <button onClick={() => setModalOuverte(false)} style={{ background: 'none', border: 'none', color: c.textMuted, cursor: 'pointer' }}><IcoX size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Type</label>
                <select value={form.type} onChange={champ('type')} style={inputStyle}>
                  {TYPES.filter(t => t.val).map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Nom *</label>
                <input value={form.nom} onChange={champ('nom')} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Thème</label>
                <input value={form.theme} onChange={champ('theme')} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Description / Organisation</label>
                <textarea value={form.description} onChange={champ('description')} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div>
                <label style={labelStyle}>Consignes</label>
                <textarea value={form.consignes} onChange={champ('consignes')} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div>
                <label style={labelStyle}>Variables</label>
                <textarea value={form.variables} onChange={champ('variables')} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={labelStyle}>Durée (min)</label>
                  <input type="number" min="0" value={form.duree} onChange={champ('duree')} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Nb joueurs</label>
                  <input value={form.nb_joueurs} onChange={champ('nb_joueurs')} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Tags</label>
                <input value={form.tags} onChange={champ('tags')} style={inputStyle} placeholder="séparés par une virgule" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={sauvegarder} disabled={saving || !form.nom.trim()} style={{ flex: 1, background: c.accent, color: '#fff', border: 'none', borderRadius: '8px', padding: '11px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: (saving || !form.nom.trim()) ? 0.6 : 1 }}>
                {saving ? 'Enregistrement...' : enEdition ? 'Enregistrer' : 'Ajouter à la bibliothèque'}
              </button>
              <button onClick={() => setModalOuverte(false)} style={{ background: 'none', border: `1px solid ${c.border}`, color: c.textMuted, borderRadius: '8px', padding: '11px 20px', fontSize: '13px', cursor: 'pointer' }}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
