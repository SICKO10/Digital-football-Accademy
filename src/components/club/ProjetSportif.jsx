import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabase'
import { useColors } from '../../lib/theme'
import { alpha } from '../../tokens'
import { labelCategorie } from '../../lib/categories'
import { POLES, polesMasculins, polesFeminins } from '../../constants/poles'
import { saisonActuelle } from '../../lib/saison'
import PlanificationAnnuelle from './PlanificationAnnuelle'
import TerrainZonesSvg from '../TerrainZonesSvg'
import DemiTerrainSchema from '../DemiTerrainSchema'

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
  { val: 'pressing', label: 'Pressing' },
  { val: 'cpa_offensif', label: 'CPA offensifs' },
  { val: 'cpa_defensif', label: 'CPA défensifs' },
]
const ZONE_VIDE = { x: 10, y: 10, largeur: 80, hauteur: 15, label: '', description: '', couleur: '#4ade80' }

const OUTILS_CPA = [
  { id: 'joueur', label: '●', title: 'Joueur' },
  { id: 'carre', label: '■', title: 'Zone carrée' },
  { id: 'cercle_zone', label: '○', title: 'Zone cercle' },
  { id: 'fleche', label: '→', title: 'Flèche' },
]
const COULEURS_ZONE_CPA = [
  { label: 'Vert', value: '#4ade80' },
  { label: 'Rouge', value: '#f87171' },
  { label: 'Bleu', value: '#60a5fa' },
  { label: 'Jaune', value: '#facc15' },
  { label: 'Orange', value: '#fb923c' },
]

function PlaceholderAVenir({ couleur, texte }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', border: '1px dashed', borderColor: couleur + '44', borderRadius: 14 }}>
      <p style={{ color: couleur, fontWeight: 700, fontSize: 14, margin: '0 0 6px' }}>Bientôt disponible</p>
      <p style={{ color: 'inherit', opacity: 0.6, fontSize: 13, margin: 0 }}>{texte}</p>
    </div>
  )
}

// Phases pour lesquelles une photo illustrative peut être ajoutée en plus
// des principes texte — pour l'instant limité à Organisation offensive/
// défensive (seules phases demandées), extensible plus tard si besoin.
const PHASES_AVEC_PHOTO = ['attaque', 'defense']

export function SectionPrincipes({ pole, clubId, readOnly }) {
  const colors = useColors()
  const [principes, setPrincipes] = useState([])
  const [ajoutPhase, setAjoutPhase] = useState(null)
  const [texte, setTexte] = useState('')
  const [photos, setPhotos] = useState({})
  const [photoUploading, setPhotoUploading] = useState(null)

  const charger = async () => {
    const { data } = await supabase.from('principes_jeu').select('*').eq('club_id', clubId).eq('pole_key', pole.key).order('ordre')
    setPrincipes(data || [])
  }
  useEffect(() => { charger() }, [pole.key, clubId])

  useEffect(() => {
    if (!clubId) return
    supabase.from('principes_photos').select('phase, image_url').eq('club_id', clubId).eq('pole_key', pole.key)
      .then(({ data }) => {
        const map = {}
        data?.forEach(p => { map[p.phase] = p.image_url })
        setPhotos(map)
      })
  }, [clubId, pole.key])

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

  const uploaderPhoto = async (phase, e) => {
    const file = e.target.files[0]
    if (!file || !clubId) return
    setPhotoUploading(phase)
    try {
      const sigRes = await fetch('/api/upload-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: clubId, type: 'principe_photo' }) })
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
      const { error } = await supabase.from('principes_photos').upsert({ club_id: clubId, pole_key: pole.key, phase, image_url: uploadData.secure_url }, { onConflict: 'club_id,pole_key,phase' })
      if (error) throw error
      setPhotos(prev => ({ ...prev, [phase]: uploadData.secure_url }))
    } catch (err) {
      alert('Erreur upload : ' + err.message)
    }
    setPhotoUploading(null)
    e.target.value = ''
  }

  const retirerPhoto = async (phase) => {
    if (!confirm('Retirer cette photo ?')) return
    await supabase.from('principes_photos').delete().eq('club_id', clubId).eq('pole_key', pole.key).eq('phase', phase)
    setPhotos(prev => { const n = { ...prev }; delete n[phase]; return n })
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

            {PHASES_AVEC_PHOTO.includes(phase.val) && (
              <div style={{ marginBottom: 14 }}>
                {photos[phase.val] ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={photos[phase.val]} alt="" style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 10, display: 'block' }} />
                    {!readOnly && (
                      <button onClick={() => retirerPhoto(phase.val)} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        Retirer
                      </button>
                    )}
                  </div>
                ) : !readOnly && (
                  <label style={{ display: 'inline-block', background: pole.couleur + '15', color: pole.couleur, border: `1px dashed ${pole.couleur}55`, borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: photoUploading === phase.val ? 'default' : 'pointer', opacity: photoUploading === phase.val ? 0.6 : 1 }}>
                    {photoUploading === phase.val ? 'Envoi...' : '+ Ajouter une photo'}
                    <input type="file" accept="image/*" onChange={e => uploaderPhoto(phase.val, e)} disabled={photoUploading === phase.val} style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            )}

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

  // Fond du terrain (image uploadée par le club) : un réglage par pôle ET
  // par phase (organisation offensive/défensive/transition/CPA), même
  // granularité que les zones dessinées dessus — cf. terrain_fonds,
  // upsert sur (club_id, pole_key, phase).
  useEffect(() => {
    if (!clubId) return
    supabase.from('terrain_fonds').select('image_url').eq('club_id', clubId).eq('pole_key', pole.key).eq('phase', phaseActive).maybeSingle()
      .then(({ data }) => setFondUrl(data?.image_url || null))
  }, [clubId, pole.key, phaseActive])

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
      await supabase.from('terrain_fonds').upsert({ club_id: clubId, pole_key: pole.key, phase: phaseActive, image_url: uploadData.secure_url }, { onConflict: 'club_id,pole_key,phase' })
      setFondUrl(uploadData.secure_url)
    } catch (err) {
      alert('Erreur upload : ' + err.message)
    }
    setFondUploading(false)
    e.target.value = ''
  }

  const retirerFond = async () => {
    if (!confirm('Revenir au terrain généré par défaut ?')) return
    await supabase.from('terrain_fonds').delete().eq('club_id', clubId).eq('pole_key', pole.key).eq('phase', phaseActive)
    setFondUrl(null)
  }

  // Galerie d'images de référence supplémentaires (plusieurs par pôle+phase,
  // sans zones dessus) — distincte de l'image de fond ci-dessus (une seule,
  // support des zones). cf. terrain_galerie.
  const [galerie, setGalerie] = useState([])
  const [galerieUploading, setGalerieUploading] = useState(false)

  useEffect(() => {
    if (!clubId) { setGalerie([]); return }
    supabase.from('terrain_galerie').select('*').eq('club_id', clubId).eq('pole_key', pole.key).eq('phase', phaseActive).order('ordre')
      .then(({ data }) => setGalerie(data || []))
  }, [clubId, pole.key, phaseActive])

  const ajouterImageGalerie = async (e) => {
    const file = e.target.files[0]
    if (!file || !clubId) return
    setGalerieUploading(true)
    try {
      const sigRes = await fetch('/api/upload-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: clubId, type: 'terrain_galerie' }) })
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
      const { data } = await supabase.from('terrain_galerie').insert({ club_id: clubId, pole_key: pole.key, phase: phaseActive, image_url: uploadData.secure_url, ordre: galerie.length }).select().single()
      if (data) setGalerie(prev => [...prev, data])
    } catch (err) {
      alert('Erreur upload : ' + err.message)
    }
    setGalerieUploading(false)
    e.target.value = ''
  }

  const supprimerImageGalerie = async (id) => {
    if (!confirm('Supprimer cette image ?')) return
    await supabase.from('terrain_galerie').delete().eq('id', id)
    setGalerie(prev => prev.filter(g => g.id !== id))
  }

  // Schémas CPA (offensifs/défensifs) : autant de demi-terrains que voulu par
  // phase, chacun avec ses propres ronds noir/blanc représentant les joueurs
  // — cf. cpa_schemas, distinct des zones rectangulaires ci-dessus.
  const estPhaseCpa = phaseActive === 'cpa_offensif' || phaseActive === 'cpa_defensif'
  const [cpaSchemas, setCpaSchemas] = useState([])
  const [cpaSchemaActifId, setCpaSchemaActifId] = useState(null)
  const [cpaCouleur, setCpaCouleur] = useState('noir')
  const [outilCpa, setOutilCpa] = useState('joueur')
  const [couleurZoneCpa, setCouleurZoneCpa] = useState('#4ade80')

  useEffect(() => {
    const charger = async () => {
      if (!clubId || !estPhaseCpa) { setCpaSchemas([]); setCpaSchemaActifId(null); return }
      const { data } = await supabase.from('cpa_schemas').select('*').eq('club_id', clubId).eq('pole_key', pole.key).eq('phase', phaseActive).order('ordre')
      setCpaSchemas(data || [])
      setCpaSchemaActifId(data?.[0]?.id || null)
    }
    charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, pole.key, phaseActive, estPhaseCpa])

  const cpaSchemaActif = cpaSchemas.find(s => s.id === cpaSchemaActifId) || null

  const nouveauSchemaCpa = async () => {
    const { data, error } = await supabase.from('cpa_schemas').insert({
      club_id: clubId, pole_key: pole.key, phase: phaseActive,
      nom: `Schéma ${cpaSchemas.length + 1}`, elements: [], legende: {}, ordre: cpaSchemas.length,
    }).select().single()
    if (error) { alert(error.message); return }
    setCpaSchemas(prev => [...prev, data])
    setCpaSchemaActifId(data.id)
  }

  const renommerSchemaCpa = async (nom) => {
    if (!cpaSchemaActif) return
    await supabase.from('cpa_schemas').update({ nom }).eq('id', cpaSchemaActif.id)
    setCpaSchemas(prev => prev.map(s => s.id === cpaSchemaActif.id ? { ...s, nom } : s))
  }

  const supprimerSchemaCpa = async (id) => {
    if (!confirm('Supprimer ce schéma ?')) return
    await supabase.from('cpa_schemas').delete().eq('id', id)
    setCpaSchemas(prev => {
      const suivants = prev.filter(s => s.id !== id)
      if (cpaSchemaActifId === id) setCpaSchemaActifId(suivants[0]?.id || null)
      return suivants
    })
  }

  const cpaElementsRef = useRef([])

  const majElementsCpa = async (elements) => {
    if (!cpaSchemaActif) return
    cpaElementsRef.current = elements
    setCpaSchemas(prev => prev.map(s => s.id === cpaSchemaActif.id ? { ...s, elements } : s))
    await supabase.from('cpa_schemas').update({ elements }).eq('id', cpaSchemaActif.id)
  }

  // Pendant un glisser-déposer, on met à jour l'état local (affichage fluide)
  // à chaque mouvement sans écrire en base à chaque pixel — la persistance
  // n'a lieu qu'une fois au relâchement (finDeplacementCpa).
  const majElementsCpaLocal = (elements) => {
    if (!cpaSchemaActif) return
    cpaElementsRef.current = elements
    setCpaSchemas(prev => prev.map(s => s.id === cpaSchemaActif.id ? { ...s, elements } : s))
  }

  const creerElementCpa = (elementSansId) => {
    if (!cpaSchemaActif) return
    majElementsCpa([...(cpaSchemaActif.elements || []), { id: crypto.randomUUID(), ...elementSansId }])
  }

  const supprimerElementCpa = (id) => {
    if (!cpaSchemaActif) return
    majElementsCpa((cpaSchemaActif.elements || []).filter(el => el.id !== id))
  }

  const deplacerJoueurCpa = (id, x, y) => {
    if (!cpaSchemaActif) return
    majElementsCpaLocal((cpaSchemaActif.elements || []).map(el => el.id === id ? { ...el, x, y } : el))
  }

  const finDeplacementCpa = () => {
    majElementsCpa(cpaElementsRef.current)
  }

  const numeroterElementCpa = (id) => {
    if (!cpaSchemaActif) return
    const actuel = (cpaSchemaActif.elements || []).find(el => el.id === id)?.numero || ''
    const saisie = window.prompt('Numéro du joueur (laisser vide pour le retirer)', actuel)
    if (saisie === null) return
    majElementsCpa((cpaSchemaActif.elements || []).map(el => el.id === id ? { ...el, numero: saisie.trim() } : el))
  }

  const majLegendeCpa = async (legende) => {
    if (!cpaSchemaActif) return
    setCpaSchemas(prev => prev.map(s => s.id === cpaSchemaActif.id ? { ...s, legende } : s))
    await supabase.from('cpa_schemas').update({ legende }).eq('id', cpaSchemaActif.id)
  }

  const numerosCpaUtilises = cpaSchemaActif ? Array.from(new Set([
    ...(cpaSchemaActif.elements || []).filter(el => el.type === 'joueur' && el.numero).map(el => el.numero),
    ...Object.keys(cpaSchemaActif.legende || {}),
  ])).sort((a, b) => (Number(a) || 0) - (Number(b) || 0) || String(a).localeCompare(String(b))) : []

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

      {!estPhaseCpa && (
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
          {!readOnly && (
            <p style={{ color: colors.text.faint, fontSize: 10, margin: '8px 0 0', fontStyle: 'italic' }}>Propre à ce pôle et cette phase — change d'onglet ci-dessus pour en définir une différente.</p>
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
      )}

      {estPhaseCpa && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ color: colors.text.primary, margin: '0 0 4px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Schémas CPA</h3>
          <p style={{ color: colors.text.faint, fontSize: 12, margin: '0 0 14px' }}>
            Autant de demi-terrains que nécessaire (corners, coups francs…) : joueurs noir/blanc numérotés, zones carrées ou circulaires et flèches.
          </p>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {cpaSchemas.map(s => (
              <button key={s.id} onClick={() => setCpaSchemaActifId(s.id)}
                style={{
                  padding: '6px 12px', borderRadius: 20, border: `1px solid ${cpaSchemaActifId === s.id ? pole.couleur : colors.border.faint}`,
                  background: cpaSchemaActifId === s.id ? pole.couleur + '22' : 'transparent',
                  color: cpaSchemaActifId === s.id ? pole.couleur : colors.text.faint,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}>
                {s.nom}
              </button>
            ))}
            {!readOnly && (
              <button onClick={nouveauSchemaCpa} style={{ padding: '6px 12px', borderRadius: 20, border: `1px dashed ${pole.couleur}66`, background: 'transparent', color: pole.couleur, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                + Nouveau schéma
              </button>
            )}
          </div>

          {!cpaSchemaActif ? (
            <p style={{ color: colors.text.faint, fontSize: 12, fontStyle: 'italic', margin: 0 }}>Aucun schéma pour cette phase.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 620px) 1fr', gap: 20, alignItems: 'start' }}>
              <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 12, padding: 16 }}>
                {!readOnly && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    {OUTILS_CPA.map(o => (
                      <button key={o.id} onClick={() => setOutilCpa(o.id)} title={o.title}
                        style={{
                          width: 36, height: 36, borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                          background: outilCpa === o.id ? pole.couleur : colors.background.raised,
                          color: outilCpa === o.id ? '#0a0a0a' : colors.text.secondary,
                          border: `1px solid ${outilCpa === o.id ? pole.couleur : colors.border.default}`,
                        }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
                <DemiTerrainSchema
                  elements={cpaSchemaActif.elements || []}
                  outil={readOnly ? 'joueur' : outilCpa}
                  couleurJoueur={cpaCouleur}
                  couleurZone={couleurZoneCpa}
                  onCreerElement={readOnly ? null : creerElementCpa}
                  onDeplacerJoueur={readOnly ? null : deplacerJoueurCpa}
                  onFinDeplacement={readOnly ? null : finDeplacementCpa}
                  onNumeroter={readOnly ? null : numeroterElementCpa}
                  onSupprimer={readOnly ? null : supprimerElementCpa}
                  maxWidth={620}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {!readOnly && (
                  <>
                    <div>
                      <label style={labelStyle}>Nom du schéma</label>
                      <input style={champStyle} defaultValue={cpaSchemaActif.nom} onBlur={e => e.target.value.trim() && renommerSchemaCpa(e.target.value.trim())} />
                    </div>

                    {outilCpa === 'joueur' ? (
                      <div>
                        <label style={labelStyle}>Couleur à poser</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {[['noir', 'Noir', '#111'], ['blanc', 'Blanc', '#fff']].map(([val, label, swatch]) => (
                            <button key={val} onClick={() => setCpaCouleur(val)}
                              style={{
                                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Inter, sans-serif',
                                border: `1px solid ${cpaCouleur === val ? pole.couleur : colors.border.default}`,
                                background: cpaCouleur === val ? pole.couleur + '22' : 'transparent',
                                color: cpaCouleur === val ? pole.couleur : colors.text.secondary,
                              }}>
                              <span style={{ width: 12, height: 12, borderRadius: '50%', background: swatch, border: '1px solid #888' }} />
                              {label}
                            </button>
                          ))}
                        </div>
                        <p style={{ color: colors.text.faint, fontSize: 10, margin: '6px 0 0', fontStyle: 'italic' }}>Clique sur le terrain pour poser un rond, glisse un rond pour le déplacer, clique dessus pour lui donner un numéro, double-clique pour le retirer.</p>
                      </div>
                    ) : (
                      <div>
                        <label style={labelStyle}>Couleur</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {COULEURS_ZONE_CPA.map(c => (
                            <button key={c.value} onClick={() => setCouleurZoneCpa(c.value)} title={c.label}
                              style={{
                                width: 26, height: 26, borderRadius: '50%', background: c.value, cursor: 'pointer',
                                border: couleurZoneCpa === c.value ? `2px solid ${colors.text.primary}` : '2px solid transparent',
                              }} />
                          ))}
                        </div>
                        <p style={{ color: colors.text.faint, fontSize: 10, margin: '6px 0 0', fontStyle: 'italic' }}>Clique et glisse sur le terrain pour dessiner, double-clique dessus pour le retirer.</p>
                      </div>
                    )}

                    <button onClick={() => supprimerSchemaCpa(cpaSchemaActif.id)} style={{ background: 'none', border: 'none', color: colors.text.faint, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'Inter, sans-serif', textAlign: 'left', padding: 0 }}>
                      Supprimer ce schéma
                    </button>
                  </>
                )}

                {(cpaSchemaActif.elements || []).length === 0 && (
                  <p style={{ color: colors.text.faint, fontSize: 12, fontStyle: 'italic', margin: 0 }}>Aucun élément placé sur ce schéma.</p>
                )}

                {numerosCpaUtilises.length > 0 && (
                  <div style={{ background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: 12, padding: 14 }}>
                    <p style={{ color: pole.couleur, fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 10px' }}>Légende</p>
                    {numerosCpaUtilises.map(num => (
                      <div key={num} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: colors.background.raised, border: `1.5px solid ${pole.couleur}`, color: colors.text.primary, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {num}
                        </div>
                        {readOnly ? (
                          <span style={{ color: colors.text.secondary, fontSize: 12 }}>{cpaSchemaActif.legende?.[num] || ''}</span>
                        ) : (
                          <input
                            defaultValue={cpaSchemaActif.legende?.[num] || ''}
                            onBlur={e => majLegendeCpa({ ...(cpaSchemaActif.legende || {}), [num]: e.target.value })}
                            placeholder={`Joueur ${num}`}
                            style={{ background: 'transparent', border: 'none', borderBottom: `1px solid ${colors.border.default}`, color: colors.text.primary, fontSize: 12, width: '100%', outline: 'none', padding: '2px 0', fontFamily: 'Inter, sans-serif' }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <h3 style={{ color: colors.text.primary, margin: '0 0 4px', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Galerie d'images supplémentaires</h3>
        <p style={{ color: colors.text.faint, fontSize: 12, margin: '0 0 14px' }}>
          Autant de visuels de référence que tu veux pour cette phase (ex: plusieurs formations) — sans zones dessus, affichés tels quels côté joueur.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
          {galerie.map(g => (
            <div key={g.id} style={{ position: 'relative' }}>
              <img src={g.image_url} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 10, border: `1px solid ${colors.border.subtle}`, display: 'block' }} />
              {!readOnly && (
                <button onClick={() => supprimerImageGalerie(g.id)}
                  style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', borderRadius: 6, width: 22, height: 22, cursor: 'pointer', fontSize: 12, fontWeight: 700, lineHeight: '22px', padding: 0 }}>
                  ✕
                </button>
              )}
            </div>
          ))}
          {!readOnly && (
            <label style={{
              aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              border: `1px dashed ${pole.couleur}66`, borderRadius: 10, color: pole.couleur, fontSize: 12, fontWeight: 700,
              cursor: galerieUploading ? 'default' : 'pointer', opacity: galerieUploading ? 0.6 : 1, padding: 8,
            }}>
              {galerieUploading ? 'Envoi...' : '+ Ajouter une image'}
              <input type="file" accept="image/*" onChange={ajouterImageGalerie} disabled={galerieUploading} style={{ display: 'none' }} />
            </label>
          )}
        </div>
        {galerie.length === 0 && readOnly && (
          <p style={{ color: colors.text.faint, fontSize: 12, fontStyle: 'italic', margin: 0 }}>Aucune image pour cette phase.</p>
        )}
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
