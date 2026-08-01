import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'

const NATURES = [
  { val: 'match', label: 'Match' },
  { val: 'tournoi', label: 'Tournoi' },
  { val: 'stage', label: 'Stage' },
  { val: 'autre', label: 'Autre' },
]

const st = {
  input: { width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', padding: '8px 10px', fontSize: '12px', boxSizing: 'border-box', outline: 'none', fontFamily: 'Inter, sans-serif' },
  label: { fontSize: '11px', color: '#555', marginBottom: '4px', display: 'block', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  card: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' },
  th: { padding: '8px 10px', textAlign: 'left', color: '#555', fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', whiteSpace: 'nowrap' },
  td: { padding: '6px 10px' },
}

const ligneVide = () => ({
  _id: crypto.randomUUID(),
  equipe: '', educateur_responsable: '', date_depart: '', heure_depart: '',
  heure_retour_estimee: '', lieu_destination: '', nature: 'match', nb_personnes: '',
})

const toMinutes = (hhmm) => {
  if (!hhmm) return null
  const [h, m] = String(hhmm).split(':').map(Number)
  if (Number.isNaN(h)) return null
  return h * 60 + (m || 0)
}

// Normalise une valeur d'heure éventuellement au format "8h30", "8.30", "830" en "HH:MM"
const normaliserHeure = (val) => {
  if (!val) return ''
  const s = String(val).trim().replace(/[h.]/i, ':')
  const m = s.match(/^(\d{1,2}):?(\d{2})?$/)
  if (!m) return ''
  const h = m[1].padStart(2, '0')
  const min = (m[2] || '00').padStart(2, '0')
  return `${h}:${min}`
}

// Mapping flexible des en-têtes de colonnes Excel/CSV (français, insensible à la casse/accents)
const ALIAS = {
  equipe: ['equipe', 'team', 'categorie'],
  date_depart: ['date'],
  heure_depart: ['heuredepart', 'departure', 'depart'],
  heure_retour_estimee: ['heureretour', 'retourestime', 'return'],
  lieu_destination: ['lieu', 'destination', 'adversaire'],
  nb_personnes: ['personnes', 'effectif', 'nbpersonnes', 'nbjoueurs'],
}
const normaliserCle = (k) => k.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '')

const ligneDepuisObjet = (obj) => {
  const ligne = ligneVide()
  const cles = Object.keys(obj)
  Object.entries(ALIAS).forEach(([champ, alias]) => {
    const cle = cles.find(k => alias.some(a => normaliserCle(k).includes(a)))
    if (cle == null) return
    let val = String(obj[cle] ?? '').trim()
    if (champ === 'heure_depart' || champ === 'heure_retour_estimee') val = normaliserHeure(val)
    ligne[champ] = val
  })
  return ligne
}

export default function RepartitionMiniBus({ clubId, accentColor = '#4ade80' }) {
  const [lignes, setLignes] = useState([])
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState(null)
  const [valide, setValide] = useState(false)

  const [vehicules, setVehicules] = useState([])
  const [loadingVehicules, setLoadingVehicules] = useState(true)
  const [showAddVehicule, setShowAddVehicule] = useState(false)
  const [newVehicule, setNewVehicule] = useState({ plaque: '', capacite: '' })
  const [savingVehicule, setSavingVehicule] = useState(false)

  const [suggestions, setSuggestions] = useState(null)
  const [publishing, setPublishing] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false)

  const fileInputRef = useRef(null)

  const chargerVehicules = async () => {
    setLoadingVehicules(true)
    const { data } = await supabase.from('vehicules').select('*').eq('club_id', clubId).order('plaque')
    setVehicules(data || [])
    setLoadingVehicules(false)
  }

  useEffect(() => { if (clubId) chargerVehicules() }, [clubId])

  const ajouterVehicule = async () => {
    if (!newVehicule.plaque.trim() || !newVehicule.capacite) return
    setSavingVehicule(true)
    const { error } = await supabase.from('vehicules').insert({ club_id: clubId, plaque: newVehicule.plaque.trim().toUpperCase(), capacite: parseInt(newVehicule.capacite) })
    setSavingVehicule(false)
    if (error) { alert('Erreur : ' + error.message); return }
    setNewVehicule({ plaque: '', capacite: '' })
    setShowAddVehicule(false)
    await chargerVehicules()
  }

  const supprimerVehicule = async (id) => {
    if (!confirm('Retirer ce véhicule du parc ?')) return
    await supabase.from('vehicules').delete().eq('id', id)
    await chargerVehicules()
  }

  // ── Étape 1 : upload / scan ────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setScanError(null)
    const ext = file.name.split('.').pop().toLowerCase()
    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      await parseTableur(file)
    } else if (file.type.startsWith('image/')) {
      await scannerImage(file)
    } else {
      setScanError('Format non supporté. Utilise une image, un fichier .xlsx ou .csv.')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const parseTableur = async (file) => {
    setScanning(true)
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const feuille = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(feuille, { defval: '' })
      const mapped = rows.map(ligneDepuisObjet).filter(l => l.equipe || l.date_depart || l.lieu_destination)
      if (mapped.length === 0) throw new Error("Aucune ligne exploitable trouvée dans le fichier.")
      setLignes(prev => [...prev, ...mapped])
      setValide(false)
    } catch (err) {
      setScanError('Erreur de lecture du fichier : ' + err.message)
    }
    setScanning(false)
  }

  const scannerImage = async (file) => {
    setScanning(true)
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY
      if (!apiKey) throw new Error('Clé VITE_GROQ_API_KEY manquante dans .env')

      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const prompt = `Tu analyses une photo ou capture d'écran d'un planning de déplacements d'équipes de football (tableau papier, tableur affiché à l'écran, planning manuscrit...).

Extrait CHAQUE déplacement/ligne visible avec : équipe, date, heure de départ, heure de retour estimée, lieu de destination, nombre de personnes (joueurs + staff).

Réponds uniquement avec du JSON valide, EXACTEMENT dans ce format :
{
  "deplacements": [
    { "equipe": "ex: U15 A", "date_depart": "AAAA-MM-JJ", "heure_depart": "HH:MM", "heure_retour_estimee": "HH:MM", "lieu_destination": "ville ou lieu", "nb_personnes": 18 }
  ]
}

Si une information n'est pas visible ou lisible, mets une chaîne vide "" (ou null pour nb_personnes). Si l'année n'est pas précisée dans le document, utilise ${new Date().getFullYear()}. Réponds UNIQUEMENT avec le JSON brut, sans backticks ni explication.`

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'qwen/qwen3.6-27b',
          messages: [
            { role: 'system', content: '/no_think\nRéponds uniquement avec du JSON valide. Aucune réflexion préalable.' },
            { role: 'user', content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
            ] },
          ],
          temperature: 0.3,
          max_completion_tokens: 4000,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error))
      const raw = data.choices?.[0]?.message?.content || ''
      const text = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error("Réponse invalide de l'IA")
      const parsed = JSON.parse(jsonMatch[0])
      const extraits = (parsed.deplacements || []).map(d => ({
        ...ligneVide(),
        equipe: d.equipe || '',
        date_depart: d.date_depart || '',
        heure_depart: normaliserHeure(d.heure_depart),
        heure_retour_estimee: normaliserHeure(d.heure_retour_estimee),
        lieu_destination: d.lieu_destination || '',
        nb_personnes: d.nb_personnes != null ? String(d.nb_personnes) : '',
      }))
      if (extraits.length === 0) throw new Error("Aucun déplacement détecté sur l'image.")
      setLignes(prev => [...prev, ...extraits])
      setValide(false)
    } catch (err) {
      setScanError(err.message)
    }
    setScanning(false)
  }

  const modifierLigne = (id, champ, valeur) => {
    setLignes(prev => prev.map(l => (l._id === id ? { ...l, [champ]: valeur } : l)))
  }

  const supprimerLigne = (id) => {
    setLignes(prev => prev.filter(l => l._id !== id))
  }

  const ajouterLigneManuelle = () => setLignes(prev => [...prev, ligneVide()])

  // ── Étape 2 : répartition ───────────────────────────────────────────────────
  const repartir = () => {
    const MARGE_MIN = 30
    const flotte = vehicules.map(v => ({ ...v, disponibleDepuis: 0 }))
    const sorted = [...lignes].sort((a, b) => (toMinutes(a.heure_depart) ?? 0) - (toMinutes(b.heure_depart) ?? 0))
    const resultat = sorted.map(l => {
      const depart = toMinutes(l.heure_depart)
      const nbPersonnes = l.nb_personnes !== '' ? parseInt(l.nb_personnes) : 0
      const candidat = depart != null
        ? flotte.find(v => v.capacite >= nbPersonnes && v.disponibleDepuis + MARGE_MIN <= depart)
        : null
      if (candidat) {
        candidat.disponibleDepuis = toMinutes(l.heure_retour_estimee) ?? depart
        return { ...l, vehicule: candidat.plaque, conducteur: '', statut: 'assigne' }
      }
      return { ...l, vehicule: '', conducteur: '', statut: 'insuffisant' }
    })
    setSuggestions(resultat)
  }

  const modifierSuggestion = (id, champ, valeur) => {
    setSuggestions(prev => prev.map(s => (s._id === id ? { ...s, [champ]: valeur } : s)))
  }

  const nbInsuffisants = (suggestions || []).filter(s => s.statut === 'insuffisant' && !s.vehicule).length

  // ── Étape 3 : publication ───────────────────────────────────────────────────
  const publierPlanning = async () => {
    if (!suggestions || suggestions.length === 0) return
    setPublishing(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = suggestions.map(s => ({
      club_id: clubId,
      equipe: s.equipe || null,
      educateur_responsable: s.educateur_responsable || null,
      date_depart: s.date_depart || null,
      heure_depart: s.heure_depart || null,
      heure_retour_estimee: s.heure_retour_estimee || null,
      lieu_destination: s.lieu_destination || null,
      nature: s.nature || 'match',
      vehicule: s.vehicule || null,
      conducteur: s.conducteur || null,
      nb_personnes: s.nb_personnes !== '' ? parseInt(s.nb_personnes) : null,
      created_by: user?.id || null,
    }))
    const { error } = await supabase.from('deplacements').insert(payload)
    setPublishing(false)
    if (error) { alert('Erreur lors de la publication : ' + error.message); return }
    setPublishSuccess(true)
    setLignes([])
    setValide(false)
    setSuggestions(null)
  }

  const recommencer = () => {
    setLignes([])
    setValide(false)
    setSuggestions(null)
    setPublishSuccess(false)
    setScanError(null)
  }

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px' }}>🚌 Répartition mini-bus</h1>
      <p style={{ color: '#555', fontSize: '13px', marginBottom: '1.5rem' }}>
        Scanne un planning de déplacements, laisse l'algorithme proposer une répartition des bus, puis publie.
      </p>

      {publishSuccess && (
        <div style={{ background: accentColor + '15', border: `1px solid ${accentColor}40`, borderRadius: '10px', padding: '14px 16px', marginBottom: '1.5rem', color: accentColor, fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span>✅ Planning publié — les déplacements apparaissent dans l'onglet Déplacements et chez les éducateurs concernés.</span>
          <button onClick={recommencer} style={{ background: 'transparent', border: `1px solid ${accentColor}40`, color: accentColor, padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            Nouveau planning
          </button>
        </div>
      )}

      {/* ── Parc de véhicules ── */}
      <div style={{ ...st.card, marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <p style={{ fontWeight: 700, fontSize: '14px', margin: 0 }}>Parc de véhicules</p>
          <button onClick={() => setShowAddVehicule(v => !v)}
            style={{ background: accentColor + '15', border: `1px solid ${accentColor}40`, color: accentColor, padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {showAddVehicule ? '✕ Fermer' : '+ Ajouter un véhicule'}
          </button>
        </div>
        {showAddVehicule && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input style={{ ...st.input, maxWidth: '180px' }} placeholder="Plaque (ex: AB-123-CD)" value={newVehicule.plaque} onChange={e => setNewVehicule(v => ({ ...v, plaque: e.target.value }))} />
            <input style={{ ...st.input, maxWidth: '140px' }} type="number" min="1" placeholder="Capacité (places)" value={newVehicule.capacite} onChange={e => setNewVehicule(v => ({ ...v, capacite: e.target.value }))} />
            <button onClick={ajouterVehicule} disabled={savingVehicule || !newVehicule.plaque.trim() || !newVehicule.capacite}
              style={{ background: accentColor, color: '#000', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              {savingVehicule ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>
        )}
        {loadingVehicules ? (
          <p style={{ color: '#444', fontSize: '12px', margin: 0 }}>Chargement...</p>
        ) : vehicules.length === 0 ? (
          <p style={{ color: '#444', fontSize: '12px', margin: 0 }}>Aucun véhicule enregistré — ajoute au moins un bus pour pouvoir lancer une répartition.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {vehicules.map(v => (
              <span key={v.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '20px', padding: '5px 8px 5px 14px', fontSize: '12px' }}>
                🚐 {v.plaque} · {v.capacite} places
                <button onClick={() => supprimerVehicule(v.id)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '13px', padding: '2px' }}>✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Étape 1 — Upload ── */}
      <div style={{ ...st.card, marginBottom: '1.5rem' }}>
        <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 4px' }}>Étape 1 — Planning de déplacements</p>
        <p style={{ fontSize: '12px', color: '#555', margin: '0 0 14px' }}>Photo/capture d'un tableau, ou fichier Excel/CSV.</p>

        <input ref={fileInputRef} type="file" accept="image/*,.xlsx,.xls,.csv" onChange={handleFileChange} style={{ display: 'none' }} id="input-scan-planning" />
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <label htmlFor="input-scan-planning"
            style={{ background: accentColor, color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: scanning ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: scanning ? 0.6 : 1, display: 'inline-flex', alignItems: 'center' }}>
            {scanning ? '⏳ Analyse en cours...' : '📷 Scanner un planning de déplacements'}
          </label>
          {lignes.length > 0 && (
            <button onClick={ajouterLigneManuelle}
              style={{ background: 'transparent', border: '1px solid #333', color: '#888', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              + Ajouter une ligne manuellement
            </button>
          )}
        </div>

        {scanError && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '12px' }}>❌ {scanError}</p>}

        {lignes.length > 0 && (
          <div style={{ marginTop: '18px', overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '760px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <th style={st.th}>Équipe</th>
                  <th style={st.th}>Date</th>
                  <th style={st.th}>Départ</th>
                  <th style={st.th}>Retour est.</th>
                  <th style={st.th}>Lieu</th>
                  <th style={st.th}>Nb pers.</th>
                  <th style={st.th}>Nature</th>
                  <th style={st.th}></th>
                </tr>
              </thead>
              <tbody>
                {lignes.map(l => (
                  <tr key={l._id} style={{ borderBottom: '1px solid #141414' }}>
                    <td style={st.td}><input style={st.input} value={l.equipe} onChange={e => modifierLigne(l._id, 'equipe', e.target.value)} /></td>
                    <td style={st.td}><input style={st.input} type="date" value={l.date_depart} onChange={e => modifierLigne(l._id, 'date_depart', e.target.value)} /></td>
                    <td style={st.td}><input style={st.input} type="time" value={l.heure_depart} onChange={e => modifierLigne(l._id, 'heure_depart', e.target.value)} /></td>
                    <td style={st.td}><input style={st.input} type="time" value={l.heure_retour_estimee} onChange={e => modifierLigne(l._id, 'heure_retour_estimee', e.target.value)} /></td>
                    <td style={st.td}><input style={{ ...st.input, minWidth: '120px' }} value={l.lieu_destination} onChange={e => modifierLigne(l._id, 'lieu_destination', e.target.value)} /></td>
                    <td style={st.td}><input style={{ ...st.input, maxWidth: '70px' }} type="number" min="0" value={l.nb_personnes} onChange={e => modifierLigne(l._id, 'nb_personnes', e.target.value)} /></td>
                    <td style={st.td}>
                      <select style={st.input} value={l.nature} onChange={e => modifierLigne(l._id, 'nature', e.target.value)}>
                        {NATURES.map(n => <option key={n.val} value={n.val}>{n.label}</option>)}
                      </select>
                    </td>
                    <td style={st.td}><button onClick={() => supprimerLigne(l._id)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '14px' }}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => { setValide(true); setSuggestions(null) }}
              style={{ marginTop: '14px', background: accentColor, color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
              ✓ Valider ces déplacements
            </button>
          </div>
        )}
      </div>

      {/* ── Étape 2 — Répartition ── */}
      {valide && lignes.length > 0 && (
        <div style={{ ...st.card, marginBottom: '1.5rem' }}>
          <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 4px' }}>Étape 2 — Répartition des mini-bus</p>
          <p style={{ fontSize: '12px', color: '#555', margin: '0 0 14px' }}>
            {lignes.length} déplacement{lignes.length > 1 ? 's' : ''} à couvrir avec {vehicules.length} véhicule{vehicules.length > 1 ? 's' : ''} disponible{vehicules.length > 1 ? 's' : ''}.
          </p>
          <button onClick={repartir} disabled={vehicules.length === 0}
            style={{ background: accentColor, color: '#000', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: vehicules.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', opacity: vehicules.length === 0 ? 0.5 : 1 }}>
            🧮 Répartir les mini-bus
          </button>

          {suggestions && (
            <div style={{ marginTop: '18px' }}>
              {nbInsuffisants > 0 && (
                <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>
                  ⚠️ Bus insuffisants pour {nbInsuffisants} déplacement{nbInsuffisants > 1 ? 's' : ''} — assigne un véhicule manuellement ci-dessous ou ajoute un bus au parc.
                </p>
              )}
              <div style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '780px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                      <th style={st.th}>Équipe</th>
                      <th style={st.th}>Départ</th>
                      <th style={st.th}>Retour est.</th>
                      <th style={st.th}>Lieu</th>
                      <th style={st.th}>Bus assigné</th>
                      <th style={st.th}>Conducteur à désigner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.map(s => (
                      <tr key={s._id} style={{ borderBottom: '1px solid #141414', background: s.statut === 'insuffisant' && !s.vehicule ? '#ef444408' : 'transparent' }}>
                        <td style={st.td}>{s.equipe || '—'}</td>
                        <td style={st.td}>{s.heure_depart || '—'}</td>
                        <td style={st.td}>{s.heure_retour_estimee || '—'}</td>
                        <td style={st.td}>{s.lieu_destination || '—'}</td>
                        <td style={st.td}>
                          <select style={{ ...st.input, borderColor: !s.vehicule ? '#ef444460' : '#2a2a2a' }} value={s.vehicule} onChange={e => modifierSuggestion(s._id, 'vehicule', e.target.value)}>
                            <option value="">— aucun —</option>
                            {vehicules.map(v => <option key={v.id} value={v.plaque}>{v.plaque} ({v.capacite} pl.)</option>)}
                          </select>
                        </td>
                        <td style={st.td}><input style={st.input} placeholder="Nom du conducteur" value={s.conducteur} onChange={e => modifierSuggestion(s._id, 'conducteur', e.target.value)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Étape 3 — Publication ── */}
              <button onClick={publierPlanning} disabled={publishing}
                style={{ marginTop: '18px', background: accentColor, color: '#000', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', opacity: publishing ? 0.6 : 1 }}>
                {publishing ? 'Publication...' : '📤 Publier le planning'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
