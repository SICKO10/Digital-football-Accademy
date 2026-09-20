import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { alpha } from '../../tokens'
import { labelCategorie } from '../../lib/categories'
import { POLES, polesMasculins, polesFeminins } from '../../constants/poles'
import { saisonActuelle } from '../../lib/saison'
import PlanificationAnnuelle from './PlanificationAnnuelle'
import TerrainZonesSvg from '../TerrainZonesSvg'

const ONGLETS = [
  { key: 'categories', label: 'Catégories & Stats' },
  { key: 'principes', label: 'Principes de jeu' },
  { key: 'zones', label: 'Zones de terrain' },
  { key: 'planification', label: 'Planification annuelle' },
  { key: 'regles', label: 'Règles du jeu' },
]

const PHASES = [
  { val: 'attaque', label: 'Organisation offensive' },
  { val: 'defense', label: 'Organisation défensive' },
  { val: 'transition_att', label: 'Transition offensive' },
  { val: 'transition_def', label: 'Transition défensive' },
  { val: 'coups_pied_arretes', label: 'Coups de pied arrêtés' },
]

// Mêmes 4 premières phases que PHASES (principes texte), + CPA scindé
// offensif/défensif (affichés côte à côte sur la même page côté joueur,
// cf. PreparationTactiqueJoueur.jsx) — propre à terrain_zones.
const PHASES_ZONES = [
  { val: 'attaque', label: 'Organisation offensive' },
  { val: 'defense', label: 'Organisation défensive' },
  { val: 'transition_att', label: 'Transition offensive' },
  { val: 'transition_def', label: 'Transition défensive' },
  { val: 'cpa_offensif', label: 'CPA offensifs' },
  { val: 'cpa_defensif', label: 'CPA défensifs' },
]
const ZONE_VIDE = { x: 10, y: 10, largeur: 80, hauteur: 15, label: '', description: '', couleur: '#4ade80' }

function PlaceholderAVenir({ couleur, texte }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px dashed', borderColor: couleur + '44', borderRadius: 14 }}>
      <p style={{ color: couleur, fontWeight: 700, fontSize: 14, margin: '0 0 6px' }}>Bientôt disponible</p>
      <p style={{ color: 'inherit', opacity: 0.6, fontSize: 13, margin: 0 }}>{texte}</p>
    </div>
  )
}

export function SectionPrincipes({ pole, clubId, readOnly }) {
  const colors = useColors()
  const [principes, setPrincipes] = useState([])
  const [ajoutPhase, setAjoutPhase] = useState(null)
  const [texte, setTexte] = useState('')

  const charger = async () => {
    const { data } = await supabase.from('principes_jeu').select('*').eq('club_id', clubId).eq('pole_key', pole.key).order('ordre')
    setPrincipes(data || [])
  }
  useEffect(() => { charger() }, [pole.key, clubId])

  const ajouter = async () => {
    if (!texte.trim()) return
    const ordre = principes.filter(p => p.phase === ajoutPhase).length
    await supabase.from('principes_jeu').insert({ club_id: clubId, pole_key: pole.key, phase: ajoutPhase, principe: texte.trim(), ordre })
    setTexte('')
    setAjoutPhase(null)
    charger()
  }

  const supprimer = async (id) => {
    await supabase.from('principes_jeu').delete().eq('id', id)
    setPrincipes(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {PHASES.map(phase => {
        const principesPhase = principes.filter(p => p.phase === phase.val)
        return (
          <div key={phase.val} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 12, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ color: colors.text.primary, margin: 0, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{phase.label}</h3>
              {!readOnly && ajoutPhase !== phase.val && (
                <button onClick={() => setAjoutPhase(phase.val)} style={{ background: pole.couleur + '22', color: pole.couleur, border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  + Ajouter
                </button>
              )}
            </div>

            {principesPhase.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${colors.border.subtle}` }}>
                <span style={{ color: pole.couleur, fontWeight: 800, fontSize: 12, minWidth: 18 }}>{i + 1}</span>
                <span style={{ flex: 1, color: colors.text.secondary, fontSize: 13 }}>{p.principe}</span>
                {!readOnly && (
                  <button onClick={() => supprimer(p.id)} style={{ background: 'none', border: 'none', color: colors.text.faint, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>Suppr.</button>
                )}
              </div>
            ))}

            {principesPhase.length === 0 && ajoutPhase !== phase.val && (
              <p style={{ color: colors.text.faint, fontSize: 12, fontStyle: 'italic', margin: 0 }}>Aucun principe défini</p>
            )}

            {ajoutPhase === phase.val && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <input
                  autoFocus
                  value={texte}
                  onChange={e => setTexte(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && ajouter()}
                  placeholder="Ex: Sortie de balle courte depuis le gardien"
                  style={{ flex: 1, background: colors.background.base, border: `1px solid ${pole.couleur}44`, borderRadius: 8, padding: '8px 12px', color: colors.text.primary, fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none' }}
                />
                <button onClick={ajouter} style={{ background: pole.couleur, color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>OK</button>
                <button onClick={() => { setAjoutPhase(null); setTexte('') }} style={{ background: colors.background.raised, color: colors.text.faint, border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}>Annuler</button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function SectionRegles({ pole, clubId, readOnly }) {
  const colors = useColors()
  const [regles, setRegles] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ categorie: pole.categories[0], titre: '', lien_externe: '', saison: saisonActuelle() })

  const charger = async () => {
    const { data } = await supabase.from('regles_jeu').select('*').eq('club_id', clubId).eq('pole_key', pole.key).order('categorie')
    setRegles(data || [])
  }
  useEffect(() => { charger() }, [pole.key, clubId])

  const ajouter = async () => {
    if (!form.titre.trim()) return
    await supabase.from('regles_jeu').insert({ ...form, club_id: clubId, pole_key: pole.key })
    setForm({ categorie: pole.categories[0], titre: '', lien_externe: '', saison: saisonActuelle() })
    setShowForm(false)
    charger()
  }

  const supprimer = async (id) => {
    await supabase.from('regles_jeu').delete().eq('id', id)
    setRegles(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <p style={{ color: colors.text.faint, fontSize: 13, margin: 0 }}>Documents officiels par catégorie — FFF, Ligue régionale</p>
        {!readOnly && (
          <button onClick={() => setShowForm(true)} style={{ background: pole.couleur, color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
            + Ajouter
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {pole.categories.map(cat => {
          const reglesCat = regles.filter(r => r.categorie === cat)
          return (
            <div key={cat}>
              <div style={{ color: pole.couleur, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{cat}</div>
              {reglesCat.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {reglesCat.map(r => (
                    <div key={r.id} style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{r.titre}</div>
                        {r.saison && <div style={{ color: colors.text.faint, fontSize: 11 }}>Saison {r.saison}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {r.lien_externe && (
                          <a href={r.lien_externe} target="_blank" rel="noreferrer"
                            style={{ background: pole.couleur + '22', color: pole.couleur, borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                            Ouvrir
                          </a>
                        )}
                        {!readOnly && (
                          <button onClick={() => supprimer(r.id)} style={{ background: 'none', border: 'none', color: colors.text.faint, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>Suppr.</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: colors.text.faint, fontSize: 12, fontStyle: 'italic', padding: '8px 0', margin: 0 }}>Aucun document</p>
              )}
            </div>
          )
        })}
      </div>

      {showForm && (
        <div onClick={() => setShowForm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: colors.background.sunken, border: `1px solid ${colors.border.default}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
            <h3 style={{ color: colors.text.primary, margin: '0 0 20px', fontSize: 15, fontWeight: 700 }}>Ajouter un document</h3>
            <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
              style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '10px 12px', color: colors.text.primary, fontSize: 13, marginBottom: 10, fontFamily: 'Inter, sans-serif' }}>
              {pole.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
              placeholder="Titre (ex: Règlements FFF U13)"
              style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '10px 12px', color: colors.text.primary, fontSize: 13, marginBottom: 10, boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
            <input value={form.lien_externe} onChange={e => setForm(f => ({ ...f, lien_externe: e.target.value }))}
              placeholder="Lien URL (FFF, Ligue...)"
              style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '10px 12px', color: colors.text.primary, fontSize: 13, marginBottom: 10, boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
            <input value={form.saison} onChange={e => setForm(f => ({ ...f, saison: e.target.value }))}
              placeholder="Saison (ex: 2026-2027)"
              style={{ width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '10px 12px', color: colors.text.primary, fontSize: 13, marginBottom: 16, boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} style={{ background: 'transparent', color: colors.text.faint, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontWeight: 700 }}>
                Annuler
              </button>
              <button onClick={ajouter} disabled={!form.titre.trim()} style={{ background: pole.couleur, color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 800, cursor: 'pointer', opacity: !form.titre.trim() ? 0.5 : 1 }}>
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function SectionZones({ pole, clubId, readOnly }) {
  const colors = useColors()
  const [zones, setZones] = useState([])
  const [phaseActive, setPhaseActive] = useState(PHASES_ZONES[0].val)
  const [editId, setEditId] = useState(null)
  const [edit, setEdit] = useState(ZONE_VIDE)
  const [saving, setSaving] = useState(false)
  const [fondUrl, setFondUrl] = useState(null)
  const [fondUploading, setFondUploading] = useState(false)

  const charger = async () => {
    const { data } = await supabase.from('terrain_zones').select('*').eq('club_id', clubId).eq('pole_key', pole.key).order('ordre')
    setZones(data || [])
  }
  useEffect(() => { charger() }, [pole.key, clubId])

  // Fond du terrain (image uploadée par le club) : un seul réglage pour tout
  // le club, partagé entre tous les pôles/phases — cf. profiles.terrain_fond_url.
  useEffect(() => {
    if (!clubId) return
    supabase.from('profiles').select('terrain_fond_url').eq('id', clubId).maybeSingle()
      .then(({ data }) => setFondUrl(data?.terrain_fond_url || null))
  }, [clubId])

  const uploaderFond = async (e) => {
    const file = e.target.files[0]
    if (!file || !clubId) return
    setFondUploading(true)
    try {
      const sigRes = await fetch('/api/upload-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: clubId, type: 'terrain_fond' }) })
      const { signature, timestamp, folder, public_id, cloud_name, api_key } = await sigRes.json()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('signature', signature)
      formData.append('timestamp', timestamp)
      formData.append('folder', folder)
      formData.append('public_id', public_id)
      formData.append('api_key', api_key)
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      if (!uploadData.secure_url) throw new Error(uploadData.error?.message || 'Échec upload')
      await supabase.from('profiles').update({ terrain_fond_url: uploadData.secure_url }).eq('id', clubId)
      setFondUrl(uploadData.secure_url)
    } catch (err) {
      alert('Erreur upload : ' + err.message)
    }
    setFondUploading(false)
    e.target.value = ''
  }

  const retirerFond = async () => {
    if (!confirm('Revenir au terrain généré par défaut ?')) return
    await supabase.from('profiles').update({ terrain_fond_url: null }).eq('id', clubId)
    setFondUrl(null)
  }

  const zonesPhase = zones.filter(z => z.phase === phaseActive)

  const ouvrirNouvelle = () => { setEditId('nouvelle'); setEdit({ ...ZONE_VIDE, label: '' }) }
  const ouvrirEdition = (z) => { setEditId(z.id); setEdit({ x: z.x, y: z.y, largeur: z.largeur, hauteur: z.hauteur, label: z.label, description: z.description || '', couleur: z.couleur || '#4ade80' }) }
  const annuler = () => { setEditId(null); setEdit(ZONE_VIDE) }

  const enregistrer = async () => {
    if (!edit.label.trim()) return
    setSaving(true)
    const champs = {
      x: Number(edit.x) || 0, y: Number(edit.y) || 0, largeur: Number(edit.largeur) || 0, hauteur: Number(edit.hauteur) || 0,
      label: edit.label.trim(), description: edit.description.trim() || null, couleur: edit.couleur,
    }
    if (editId === 'nouvelle') {
      await supabase.from('terrain_zones').insert({ ...champs, club_id: clubId, pole_key: pole.key, phase: phaseActive, ordre: zonesPhase.length })
    } else {
      await supabase.from('terrain_zones').update(champs).eq('id', editId)
    }
    setSaving(false)
    annuler()
    charger()
  }

  const supprimer = async (id) => {
    if (!confirm('Supprimer cette zone ?')) return
    await supabase.from('terrain_zones').delete().eq('id', id)
    if (editId === id) annuler()
    charger()
  }

  const champStyle = { width: '100%', background: colors.background.base, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '8px 10px', color: colors.text.primary, fontSize: 13, boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }
  const labelStyle = { color: colors.text.faint, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }

  return (
    <div>
      <p style={{ color: colors.text.faint, fontSize: 13, margin: '0 0 16px' }}>
        Dessine tes propres zones de terrain (position, taille, couleur, libellé) pour chaque phase de jeu — affichées telles quelles dans le dashboard de tes joueurs.
      </p>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {PHASES_ZONES.map(ph => (
          <button key={ph.val} onClick={() => { setPhaseActive(ph.val); annuler() }}
            style={{
              padding: '7px 14px', borderRadius: 20, border: `1px solid ${phaseActive === ph.val ? pole.couleur : colors.border.faint}`,
              background: phaseActive === ph.val ? pole.couleur + '22' : 'transparent',
              color: phaseActive === ph.val ? pole.couleur : colors.text.faint,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            }}>
            {ph.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'start' }}>
        <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 12, padding: 16 }}>
          <TerrainZonesSvg fondUrl={fondUrl} zones={editId ? zonesPhase.map(z => (z.id === editId ? { ...z, ...edit } : z)).concat(editId === 'nouvelle' ? [{ id: 'nouvelle', ...edit }] : []) : zonesPhase} />
          {!readOnly && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <label style={{ flex: 1, textAlign: 'center', background: pole.couleur + '22', color: pole.couleur, borderRadius: 8, padding: '8px 10px', fontSize: 11, fontWeight: 700, cursor: fondUploading ? 'default' : 'pointer', opacity: fondUploading ? 0.6 : 1 }}>
                {fondUploading ? 'Envoi...' : (fondUrl ? "Changer l'image" : 'Image de fond')}
                <input type="file" accept="image/*" onChange={uploaderFond} disabled={fondUploading} style={{ display: 'none' }} />
              </label>
              {fondUrl && (
                <button onClick={retirerFond} style={{ background: 'none', border: `1px solid ${colors.border.default}`, color: colors.text.faint, borderRadius: 8, padding: '8px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  Retirer
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {zonesPhase.length === 0 && !editId && (
            <p style={{ color: colors.text.faint, fontSize: 12, fontStyle: 'italic', margin: 0 }}>Aucune zone définie pour cette phase.</p>
          )}

          {zonesPhase.map(z => (
            editId === z.id ? null : (
              <div key={z.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: z.couleur || '#4ade80', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: 13 }}>{z.label}</div>
                  {z.description && <div style={{ color: colors.text.faint, fontSize: 11, marginTop: 2 }}>{z.description}</div>}
                </div>
                {!readOnly && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => ouvrirEdition(z)} style={{ background: 'none', border: 'none', color: pole.couleur, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>Modifier</button>
                    <button onClick={() => supprimer(z.id)} style={{ background: 'none', border: 'none', color: colors.text.faint, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>Suppr.</button>
                  </div>
                )}
              </div>
            )
          ))}

          {editId && (
            <div style={{ background: colors.background.sunken, border: `1px solid ${pole.couleur}44`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={labelStyle}>Libellé *</label>
                <input autoFocus style={champStyle} value={edit.label} onChange={e => setEdit(p => ({ ...p, label: e.target.value }))} placeholder="Ex: Golden Zone" />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <input style={champStyle} value={edit.description} onChange={e => setEdit(p => ({ ...p, description: e.target.value }))} placeholder="Ex: Zone de finition prioritaire" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={labelStyle}>X (%)</label>
                  <input type="number" min="0" max="100" style={champStyle} value={edit.x} onChange={e => setEdit(p => ({ ...p, x: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Y (%)</label>
                  <input type="number" min="0" max="100" style={champStyle} value={edit.y} onChange={e => setEdit(p => ({ ...p, y: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Largeur (%)</label>
                  <input type="number" min="1" max="100" style={champStyle} value={edit.largeur} onChange={e => setEdit(p => ({ ...p, largeur: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Hauteur (%)</label>
                  <input type="number" min="1" max="100" style={champStyle} value={edit.hauteur} onChange={e => setEdit(p => ({ ...p, hauteur: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Couleur</label>
                <input type="color" value={edit.couleur} onChange={e => setEdit(p => ({ ...p, couleur: e.target.value }))} style={{ width: '100%', height: 34, border: `1px solid ${colors.border.default}`, borderRadius: 8, background: 'none', cursor: 'pointer' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={annuler} style={{ flex: 1, background: 'transparent', color: colors.text.faint, border: `1px solid ${colors.border.default}`, borderRadius: 8, padding: '9px', cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>Annuler</button>
                <button onClick={enregistrer} disabled={saving || !edit.label.trim()} style={{ flex: 2, background: pole.couleur, color: '#0a0a0a', border: 'none', borderRadius: 8, padding: '9px', fontWeight: 800, cursor: 'pointer', fontSize: 12, opacity: (saving || !edit.label.trim()) ? 0.5 : 1 }}>
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}

          {!readOnly && !editId && (
            <button onClick={ouvrirNouvelle} style={{ background: pole.couleur + '15', color: pole.couleur, border: `1px solid ${pole.couleur}40`, borderRadius: 8, padding: '10px', fontWeight: 700, cursor: 'pointer', fontSize: 12, marginTop: zonesPhase.length > 0 ? 4 : 0 }}>
              + Ajouter une zone
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailPole({ pole, categories, clubId, readOnly, logoUrl, couleurPrimaire, couleurSecondaire, onRetour }) {
  const colors = useColors()
  const [onglet, setOnglet] = useState('categories')
  const equipesDuPole = categories.filter(c => pole.categories.includes(c.nom))
  // La planification annuelle est propre à chaque catégorie précise (un U15 et
  // un U16 n'ont pas le même contenu de saison), pas au pôle dans son ensemble.
  const [categorieActive, setCategorieActive] = useState(equipesDuPole[0]?.nom || null)
  useEffect(() => {
    if (!equipesDuPole.some(c => c.nom === categorieActive)) setCategorieActive(equipesDuPole[0]?.nom || null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pole.key])

  return (
    <div>
      <button onClick={onRetour} style={{ background: 'none', border: 'none', color: colors.text.faint, fontSize: 13, cursor: 'pointer', marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontFamily: 'Inter, sans-serif' }}>
        ← Projet Sportif
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ width: 14, height: 14, borderRadius: 4, background: pole.couleur, flexShrink: 0 }} />
        <div>
          <h2 style={{ color: colors.text.primary, fontSize: 22, fontWeight: 900, margin: '0 0 6px' }}>{pole.label}</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {pole.categories.map(cat => (
              <span key={cat} style={{ background: pole.couleur + '22', color: pole.couleur, borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>{cat}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${colors.border.subtle}`, marginBottom: 24, overflowX: 'auto' }}>
        {ONGLETS.map(o => (
          <button key={o.key} onClick={() => setOnglet(o.key)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '10px 18px',
              fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif',
              color: onglet === o.key ? pole.couleur : colors.text.faint,
              borderBottom: onglet === o.key ? `2px solid ${pole.couleur}` : '2px solid transparent',
            }}>
            {o.label}
          </button>
        ))}
      </div>

      {onglet === 'categories' && (
        equipesDuPole.length === 0 ? (
          <PlaceholderAVenir couleur={pole.couleur} texte="Aucune équipe créée dans ce pôle pour l'instant. Ajoute une catégorie depuis Sportif → Catégories." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {equipesDuPole.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 12, padding: '12px 16px' }}>
                <span style={{ color: colors.text.primary, fontWeight: 700, fontSize: 14 }}>
                  {labelCategorie(c.nom)}{c.equipe ? ` ${c.equipe}` : ''}
                </span>
                <span style={{ color: colors.text.faint, fontSize: 12 }}>
                  {c.educateur ? `${c.educateur.prenom || ''} ${c.educateur.nom || ''}`.trim() : 'Aucun éducateur affecté'}
                </span>
              </div>
            ))}
          </div>
        )
      )}
      {onglet === 'principes' && <SectionPrincipes pole={pole} clubId={clubId} readOnly={readOnly} />}
      {onglet === 'zones' && <SectionZones pole={pole} clubId={clubId} readOnly={readOnly} />}
      {onglet === 'planification' && (
        equipesDuPole.length === 0 ? (
          <PlaceholderAVenir couleur={pole.couleur} texte="Aucune équipe créée dans ce pôle pour l'instant. Ajoute une catégorie depuis Sportif → Catégories." />
        ) : (
          <div>
            {equipesDuPole.length > 1 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                {equipesDuPole.map(c => (
                  <button key={c.id} onClick={() => setCategorieActive(c.nom)} style={{
                    padding: '6px 14px', borderRadius: 20, border: `1px solid ${categorieActive === c.nom ? pole.couleur : colors.border.faint}`,
                    background: categorieActive === c.nom ? pole.couleur + '22' : 'transparent',
                    color: categorieActive === c.nom ? pole.couleur : colors.text.faint,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                  }}>
                    {labelCategorie(c.nom)}{c.equipe ? ` ${c.equipe}` : ''}
                  </button>
                ))}
              </div>
            )}
            <PlanificationAnnuelle categorie={categorieActive} clubId={clubId} pole={pole} readOnly={readOnly} peutGererSeances={false}
              logoUrl={logoUrl} couleurPrimaire={couleurPrimaire} couleurSecondaire={couleurSecondaire} />
          </div>
        )
      )}
      {onglet === 'regles' && <SectionRegles pole={pole} clubId={clubId} readOnly={readOnly} />}
    </div>
  )
}

// Structure et navigation des 4 pôles du club (École de Foot, Préformation,
// Formation, Pôle Senior). "Catégories & Stats" affiche les vraies équipes du
// club (club_categories) ; Principes de jeu / Planification annuelle / Règles
// du jeu sont des sections à part entière (principes_jeu, planification_annuelle,
// regles_jeu), en écriture pour le club/staff et lecture seule sinon.
export default function ProjetSportif({ categories = [], clubId, readOnly = false, logoUrl, couleurPrimaire, couleurSecondaire }) {
  const colors = useColors()
  const [poleActifKey, setPoleActifKey] = useState(null)
  const [genre, setGenre] = useState('masculin')

  if (poleActifKey) {
    return <DetailPole pole={{ key: poleActifKey, ...POLES[poleActifKey] }} categories={categories} clubId={clubId} readOnly={readOnly}
      logoUrl={logoUrl} couleurPrimaire={couleurPrimaire} couleurSecondaire={couleurSecondaire} onRetour={() => setPoleActifKey(null)} />
  }

  const poles = genre === 'masculin' ? polesMasculins() : polesFeminins()

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <p style={{ color: colors.text.faint, fontSize: 13, margin: 0 }}>
          Organisation, objectifs et principes de jeu par pôle.
        </p>
        <div style={{ display: 'flex', background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 10, padding: 3, gap: 3 }}>
          <button onClick={() => setGenre('masculin')} style={{
            padding: '7px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 12, fontFamily: 'Inter, sans-serif',
            background: genre === 'masculin' ? colors.background.raised : 'transparent',
            color: genre === 'masculin' ? colors.text.primary : colors.text.faint,
          }}>
            Masculin
          </button>
          <button onClick={() => setGenre('feminin')} style={{
            padding: '7px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 12, fontFamily: 'Inter, sans-serif',
            background: genre === 'feminin' ? '#ec489922' : 'transparent',
            color: genre === 'feminin' ? '#ec4899' : colors.text.faint,
          }}>
            Féminin
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {poles.map(pole => {
          const key = pole.key
          const nbEquipes = categories.filter(c => pole.categories.includes(c.nom)).length
          return (
            <div key={key} onClick={() => setPoleActifKey(key)}
              style={{ background: colors.background.surface, border: `1px solid ${pole.couleur}33`, borderRadius: 16, padding: 22, cursor: 'pointer' }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: pole.couleur, display: 'inline-block', marginBottom: 12 }} />
              <h3 style={{ color: colors.text.primary, fontSize: 17, fontWeight: 900, margin: '0 0 8px' }}>{pole.label}</h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                {pole.categories.map(cat => (
                  <span key={cat} style={{ background: pole.couleur + alpha.subtle, color: pole.couleur, borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>{cat}</span>
                ))}
              </div>
              <p style={{ color: colors.text.faint, fontSize: 12, margin: 0 }}>
                {nbEquipes} équipe{nbEquipes !== 1 ? 's' : ''} du club
              </p>
              <div style={{ marginTop: 14, color: pole.couleur, fontSize: 12, fontWeight: 700 }}>
                Accéder →
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
